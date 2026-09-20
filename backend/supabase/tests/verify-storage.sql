\set ON_ERROR_STOP on
-- This harness deliberately supplies the small Supabase auth/role surface that
-- an ordinary postgres:16 container lacks. It is not a provisioning migration.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

\ir ../migrations/202609190001_private_state.sql

insert into auth.users(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222') on conflict do nothing;

do $$
declare initial jsonb; retried jsonb; replaced jsonb; lease text;
begin
  initial := public.bootstrap_state('11111111-1111-1111-1111-111111111111',
    '{"id":"s1","accounts":[],"campusBalances":[],"universityCharges":[],"transactions":[]}',
    '{"id":"current","version":1,"snapshotId":"s1"}');
  if initial->'plan'->>'version' <> '1' then raise exception 'bootstrap failed'; end if;
  initial := public.commit_plan('11111111-1111-1111-1111-111111111111', 1, 's1', 'retry', 'hash', '{"id":"current","version":1,"snapshotId":"s1"}');
  retried := public.commit_plan('11111111-1111-1111-1111-111111111111', 1, 's1', 'retry', 'hash', '{}');
  if initial <> retried or retried->'plan'->>'version' <> '2' then raise exception 'retry must precede CAS'; end if;
  begin
    perform public.commit_plan('11111111-1111-1111-1111-111111111111', 1, 's1', 'retry', 'other-hash', '{}');
    raise exception 'expected idempotency conflict';
  exception when others then if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if; end;
  replaced := public.replace_snapshot('11111111-1111-1111-1111-111111111111', 2, 's1', '{"id":"s2","accounts":[],"campusBalances":[],"universityCharges":[],"transactions":[]}');
  if replaced->'plan'->>'version' <> '3' or replaced->'plan'->>'snapshotId' <> 's2' then raise exception 'snapshot CAS failed'; end if;
  begin update snapshots set payload = '{}' where id = 's2'; raise exception 'snapshot update unexpectedly worked';
  exception when others then if sqlerrm <> 'Snapshots are immutable' then raise; end if; end;
  if not public.consume_rate('rate', 1, now()) or public.consume_rate('rate', 1, now()) then raise exception 'rate cap failed'; end if;
  lease := public.acquire_lease('lease', 1, now());
  if lease is null or public.acquire_lease('lease', 1, now()) is not null or not public.release_lease(lease::uuid) then raise exception 'lease contract failed'; end if;
  if not public.consume_nonce('nonce', now() + interval '1 minute') or public.consume_nonce('nonce', now() + interval '1 minute') then raise exception 'nonce replay failed'; end if;
end $$;

-- Owner reads are RLS-bound; a second guest sees no rows and neither guest may
-- mutate tables or call service-only mutation RPCs directly.
do $$
declare own_count integer; other_count integer; blocked boolean;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  execute 'set local role authenticated';
  select count(*) into own_count from public.plans;
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  select count(*) into other_count from public.plans;
  if own_count <> 1 or other_count <> 0 then raise exception 'RLS isolation failed'; end if;
  blocked := false; begin insert into public.profiles(owner_id) values ('22222222-2222-2222-2222-222222222222'); exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'direct user write was allowed'; end if;
  blocked := false; begin perform public.bootstrap_state('22222222-2222-2222-2222-222222222222', '{}', '{}'); exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'authenticated user invoked mutation RPC'; end if;
  execute 'reset role';
end $$;

-- Snapshot deletion remains possible through parent/profile cleanup (the trigger
-- guards content mutation only, so ON DELETE CASCADE is not blocked).
select public.bootstrap_state('22222222-2222-2222-2222-222222222222', '{"id":"cascade-snapshot","accounts":[],"campusBalances":[],"universityCharges":[],"transactions":[]}', '{"id":"current","version":1,"snapshotId":"cascade-snapshot"}');
delete from public.profiles where owner_id = '22222222-2222-2222-2222-222222222222';
do $$ begin
  if exists (select 1 from public.snapshots where id = 'cascade-snapshot') then raise exception 'profile cascade was blocked'; end if;
end $$;
