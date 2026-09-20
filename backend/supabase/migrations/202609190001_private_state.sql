-- Private guest state. Apply through the Supabase migration runner, never from a browser.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.snapshots (
  id text primary key check (length(id) between 1 and 128),
  owner_id uuid not null references public.profiles(owner_id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.plans (
  owner_id uuid not null references public.profiles(owner_id) on delete cascade,
  id text not null default 'current' check (id = 'current'),
  version integer not null check (version > 0),
  snapshot_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  foreign key (snapshot_id, owner_id) references public.snapshots(id, owner_id)
);

create table if not exists public.revisions (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(owner_id) on delete cascade,
  plan_version integer not null,
  snapshot_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_id, plan_version)
);

create table if not exists public.idempotency (
  owner_id uuid not null references public.profiles(owner_id) on delete cascade,
  key text not null check (length(key) between 1 and 128),
  payload_hash text not null check (length(payload_hash) between 1 and 256),
  response_plan jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, key)
);

create table if not exists public.rates (
  scope text not null,
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  primary key (scope, window_start)
);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists leases_scope_expiry_idx on public.leases(scope, expires_at);

create table if not exists public.nonces (
  nonce text primary key check (length(nonce) between 1 and 512),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.snapshots enable row level security;
alter table public.plans enable row level security;
alter table public.revisions enable row level security;
alter table public.idempotency enable row level security;
alter table public.rates enable row level security;
alter table public.leases enable row level security;
alter table public.nonces enable row level security;

create policy "owner reads profiles" on public.profiles for select to authenticated using (owner_id = auth.uid());
create policy "owner reads snapshots" on public.snapshots for select to authenticated using (owner_id = auth.uid());
create policy "owner reads plans" on public.plans for select to authenticated using (owner_id = auth.uid());
create policy "owner reads revisions" on public.revisions for select to authenticated using (owner_id = auth.uid());
create policy "owner reads idempotency" on public.idempotency for select to authenticated using (owner_id = auth.uid());
-- No authenticated/anon INSERT, UPDATE, or DELETE policies: all private writes use
-- service-role RPCs below after the backend has verified the bearer token's owner id.
revoke all on public.profiles, public.snapshots, public.plans, public.revisions, public.idempotency, public.rates, public.leases, public.nonces from anon, authenticated;
grant select on public.profiles, public.snapshots, public.plans, public.revisions, public.idempotency to authenticated;

create or replace function public.reject_snapshot_mutation() returns trigger language plpgsql as $$
begin raise exception 'Snapshots are immutable'; end $$;
-- Do not intercept DELETE: deleting a profile/auth user must be able to cascade its
-- private snapshots. Snapshot content itself can never be changed.
create trigger snapshots_are_immutable before update on public.snapshots for each row execute function public.reject_snapshot_mutation();

create or replace function public.bootstrap_state(p_owner_id uuid, p_snapshot jsonb, p_plan jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing_plan public.plans%rowtype; snapshot_id text;
begin
  if p_owner_id is null or p_snapshot is null or p_plan is null then raise exception 'INVALID_STATE'; end if;
  snapshot_id := p_snapshot->>'id';
  if snapshot_id is null or snapshot_id = '' or p_plan->>'snapshotId' <> snapshot_id then raise exception 'INVALID_STATE'; end if;
  insert into profiles(owner_id) values (p_owner_id) on conflict do nothing;
  -- Serialize first bootstrap even when the profile already exists but its plan does not.
  perform 1 from profiles where owner_id = p_owner_id for update;
  select * into existing_plan from plans where owner_id = p_owner_id and id = 'current' for update;
  if found then
    return jsonb_build_object('snapshot', (select payload from snapshots where id = existing_plan.snapshot_id and owner_id = p_owner_id), 'plan', existing_plan.payload);
  end if;
  insert into snapshots(id, owner_id, payload) values (snapshot_id, p_owner_id, p_snapshot);
  insert into plans(owner_id, id, version, snapshot_id, payload) values (p_owner_id, 'current', 1, snapshot_id, jsonb_set(p_plan, '{version}', '1'::jsonb));
  insert into revisions(owner_id, plan_version, snapshot_id, payload) values (p_owner_id, 1, snapshot_id, jsonb_set(p_plan, '{version}', '1'::jsonb));
  return jsonb_build_object('snapshot', p_snapshot, 'plan', jsonb_set(p_plan, '{version}', '1'::jsonb));
end $$;

create or replace function public.commit_plan(p_owner_id uuid, p_expected_version integer, p_snapshot_id text, p_key text, p_payload_hash text, p_plan jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_plan public.plans%rowtype; duplicate public.idempotency%rowtype; saved jsonb;
begin
  -- Check this before the version comparison so a retry returns its original result.
  select * into duplicate from idempotency where owner_id = p_owner_id and key = p_key;
  if found then
    if duplicate.payload_hash <> p_payload_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('plan', duplicate.response_plan);
  end if;
  select * into current_plan from plans where owner_id = p_owner_id and id = 'current' for update;
  if not found then raise exception 'STALE_STATE'; end if;
  -- A concurrent first request may have inserted the key while we waited for the plan lock.
  select * into duplicate from idempotency where owner_id = p_owner_id and key = p_key;
  if found then
    if duplicate.payload_hash <> p_payload_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('plan', duplicate.response_plan);
  end if;
  if current_plan.version <> p_expected_version or current_plan.snapshot_id <> p_snapshot_id then raise exception 'STALE_STATE'; end if;
  saved := jsonb_set(jsonb_set(p_plan, '{version}', to_jsonb(current_plan.version + 1)), '{snapshotId}', to_jsonb(current_plan.snapshot_id));
  update plans set version = current_plan.version + 1, payload = saved, updated_at = now() where owner_id = p_owner_id and id = 'current';
  insert into revisions(owner_id, plan_version, snapshot_id, payload) values (p_owner_id, current_plan.version + 1, current_plan.snapshot_id, saved);
  insert into idempotency(owner_id, key, payload_hash, response_plan) values (p_owner_id, p_key, p_payload_hash, saved);
  return jsonb_build_object('plan', saved);
end $$;

create or replace function public.replace_snapshot(p_owner_id uuid, p_expected_version integer, p_snapshot_id text, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_plan public.plans%rowtype; new_id text; saved jsonb;
begin
  new_id := p_snapshot->>'id';
  if new_id is null or new_id = '' then raise exception 'INVALID_STATE'; end if;
  select * into current_plan from plans where owner_id = p_owner_id and id = 'current' for update;
  if not found or current_plan.version <> p_expected_version or current_plan.snapshot_id <> p_snapshot_id then raise exception 'STALE_STATE'; end if;
  insert into snapshots(id, owner_id, payload) values (new_id, p_owner_id, p_snapshot);
  saved := jsonb_set(jsonb_set(current_plan.payload, '{version}', to_jsonb(current_plan.version + 1)), '{snapshotId}', to_jsonb(new_id));
  update plans set version = current_plan.version + 1, snapshot_id = new_id, payload = saved, updated_at = now() where owner_id = p_owner_id and id = 'current';
  insert into revisions(owner_id, plan_version, snapshot_id, payload) values (p_owner_id, current_plan.version + 1, new_id, saved);
  return jsonb_build_object('snapshot', p_snapshot, 'plan', saved);
end $$;

create or replace function public.consume_rate(p_scope text, p_limit integer, p_now timestamptz)
returns boolean language plpgsql security definer set search_path = public as $$
declare bucket timestamptz := date_trunc('minute', p_now); current_count integer;
begin
  if p_limit < 1 then return false; end if;
  delete from rates where window_start < date_trunc('minute', p_now) - interval '1 day';
  insert into rates(scope, window_start, count) values (p_scope, bucket, 1)
  on conflict (scope, window_start) do update set count = rates.count + 1 returning count into current_count;
  return current_count <= p_limit;
end $$;

create or replace function public.acquire_lease(p_scope text, p_limit integer, p_now timestamptz)
returns text language plpgsql security definer set search_path = public as $$
declare lease_id uuid;
begin
  delete from leases where expires_at <= p_now;
  perform pg_advisory_xact_lock(hashtext(p_scope));
  if (select count(*) from leases where scope = p_scope and expires_at > p_now) >= p_limit then return null; end if;
  insert into leases(scope, expires_at) values (p_scope, p_now + interval '120 seconds') returning id into lease_id;
  return lease_id::text;
end $$;

create or replace function public.release_lease(p_lease_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin delete from leases where id = p_lease_id; return true; end $$;

create or replace function public.consume_nonce(p_nonce text, p_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from nonces where expires_at <= now();
  if p_expires_at <= now() then return false; end if;
  insert into nonces(nonce, expires_at) values (p_nonce, p_expires_at) on conflict do nothing;
  return found;
end $$;

revoke all on function public.bootstrap_state(uuid, jsonb, jsonb), public.commit_plan(uuid, integer, text, text, text, jsonb), public.replace_snapshot(uuid, integer, text, jsonb), public.consume_rate(text, integer, timestamptz), public.acquire_lease(text, integer, timestamptz), public.release_lease(uuid), public.consume_nonce(text, timestamptz) from public, anon, authenticated;
grant execute on function public.bootstrap_state(uuid, jsonb, jsonb), public.commit_plan(uuid, integer, text, text, text, jsonb), public.replace_snapshot(uuid, integer, text, jsonb), public.consume_rate(text, integer, timestamptz), public.acquire_lease(text, integer, timestamptz), public.release_lease(uuid), public.consume_nonce(text, timestamptz) to service_role;
