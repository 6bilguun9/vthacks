import { createSupabaseAuthenticator, type SupabaseAuthConfig } from "../auth/supabase.js";
import { AppError, type Actor, type OwnedState, type Plan, type Snapshot } from "../domain/model.js";
import type { Authenticator, Limits, Repository } from "../domain/ports.js";
import { createSupabaseLimits } from "../limits/supabase.js";

export interface InfrastructureConfig extends SupabaseAuthConfig { SUPABASE_SECRET_KEY?: string | undefined }
export interface Infrastructure { auth: Authenticator; repository: Repository; limits: Limits }
type Json = Record<string, unknown>;
const timeoutMs = 5_000;

function unavailable(): never { throw new AppError(503, "STORAGE_UNAVAILABLE", "Private storage is temporarily unavailable."); }
function safeError(status: number, body: unknown): never {
  const message = typeof body === "object" && body !== null && typeof (body as { message?: unknown }).message === "string" ? (body as { message: string }).message : "";
  if (/IDEMPOTENCY_CONFLICT/.test(message)) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for another change.");
  if (/STALE_STATE/.test(message)) throw new AppError(409, "STALE_STATE", "Your preview is stale. Refresh and try again.");
  if (status === 401 || status === 403) throw new AppError(403, "FORBIDDEN", "You cannot access this private data.");
  unavailable();
}
function state(value: unknown): OwnedState {
  if (!value || typeof value !== "object") unavailable();
  const row = value as { snapshot?: unknown; plan?: unknown };
  if (!row.snapshot || !row.plan) unavailable();
  return { snapshot: row.snapshot as Snapshot, plan: row.plan as Plan };
}

class SupabaseClient {
  constructor(private readonly config: InfrastructureConfig) {}
  private base(): string { const value = this.config.SUPABASE_URL?.replace(/\/$/, ""); if (!value) unavailable(); return value; }
  private async request(path: string, init: RequestInit, secret = false): Promise<unknown> {
    const key = secret ? this.config.SUPABASE_SECRET_KEY : this.config.SUPABASE_PUBLISHABLE_KEY;
    if (!key) unavailable();
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // New sb_secret keys are opaque API keys, not JWTs, and Supabase requires
      // them only in apikey. Legacy service-role JWTs still need Bearer auth.
      const legacyServiceJwt = secret && !key.startsWith("sb_");
      const response = await fetch(`${this.base()}${path}`, { ...init, signal: controller.signal, headers: { apikey: key, ...(legacyServiceJwt ? { authorization: `Bearer ${key}` } : {}), ...(init.headers ?? {}) } });
      const text = await response.text();
      let body: unknown = null; try { body = text ? JSON.parse(text) : null; } catch { /* deliberately do not expose provider body */ }
      if (!response.ok) safeError(response.status, body);
      return body;
    } catch (error) { if (error instanceof AppError) throw error; unavailable(); } finally { clearTimeout(timer); }
  }
  read(path: string, actor: Actor): Promise<unknown> { return this.request(`/rest/v1/${path}`, { headers: { authorization: `Bearer ${actor.token}` } }); }
  rpc(name: string, body: Json): Promise<unknown> { return this.request(`/rest/v1/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, true); }
}

function first(value: unknown): Json | null { return Array.isArray(value) && value[0] && typeof value[0] === "object" ? value[0] as Json : null; }

function createRepository(client: SupabaseClient): Repository {
  return {
    async load(actor) {
      const plan = first(await client.read(`plans?select=payload,snapshot_id&id=eq.current&limit=1`, actor));
      if (!plan || !plan.payload || typeof plan.snapshot_id !== "string") throw new AppError(404, "STATE_NOT_FOUND", "No saved plan exists for this guest.");
      const snapshot = first(await client.read(`snapshots?select=payload&id=eq.${encodeURIComponent(plan.snapshot_id)}&limit=1`, actor));
      if (!snapshot?.payload) throw new AppError(404, "STATE_NOT_FOUND", "No saved plan exists for this guest.");
      return state({ snapshot: snapshot.payload, plan: plan.payload });
    },
    async bootstrap(actor, initial) { return state(await client.rpc("bootstrap_state", { p_owner_id: actor.userId, p_snapshot: initial.snapshot, p_plan: initial.plan })); },
    async lookupCommit(actor, key, payloadHash) {
      const row = first(await client.read(`idempotency?select=payload_hash,response_plan&key=eq.${encodeURIComponent(key)}&limit=1`, actor));
      if (!row) return null;
      if (row.payload_hash !== payloadHash) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for another change.");
      return row.response_plan as Plan;
    },
    async commit(actor, expectedVersion, snapshotId, key, payloadHash, plan) {
      const result = await client.rpc("commit_plan", { p_owner_id: actor.userId, p_expected_version: expectedVersion, p_snapshot_id: snapshotId, p_key: key, p_payload_hash: payloadHash, p_plan: plan });
      if (!result || typeof result !== "object" || !(result as Json).plan) unavailable();
      return (result as { plan: Plan }).plan;
    },
    async replaceSnapshot(actor, expectedVersion, snapshotId, snapshot) {
      return state(await client.rpc("replace_snapshot", { p_owner_id: actor.userId, p_expected_version: expectedVersion, p_snapshot_id: snapshotId, p_snapshot: snapshot }));
    },
  };
}

/** Creates no network traffic until a port method is invoked. */
export function createInfrastructure(config: InfrastructureConfig): Infrastructure {
  const client = new SupabaseClient(config);
  return { auth: createSupabaseAuthenticator(config), repository: createRepository(client), limits: createSupabaseLimits(client) };
}
