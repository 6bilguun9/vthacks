import { AppError, type Actor, type OwnedState, type Plan, type Snapshot } from "../../src/domain/model.js";
import type { Authenticator, Limits, Repository } from "../../src/domain/ports.js";
import type { Infrastructure } from "../../src/persistence/infrastructure.js";

type Stored = { state: OwnedState; commits: Map<string, { hash: string; plan: Plan }> };

/** Test-only port implementation with the same ownership, CAS, and retry shape as Supabase. */
export class MemoryInfrastructure implements Infrastructure {
  readonly auth: Authenticator;
  readonly repository: Repository;
  readonly limits: Limits;
  private readonly states = new Map<string, Stored>();
  private readonly nonces = new Map<string, number>();
  private readonly requests = new Map<string, number[]>();
  private readonly leases = new Map<string, Set<string>>();
  private sequence = 0;

  constructor(users: Record<string, string> = {}) {
    this.auth = { authenticate: async (authorization, ip) => {
      const token = /^Bearer\s+(.+)$/i.exec(authorization ?? "")?.[1];
      if (!token) throw new AppError(401, "UNAUTHORIZED", "A valid guest session is required.");
      const userId = users[token];
      if (!userId) throw new AppError(401, "UNAUTHORIZED", "A valid guest session is required.");
      return { userId, token, ip };
    } };
    this.repository = {
      load: async actor => this.get(actor).state,
      bootstrap: async (actor, initial) => {
        const saved = this.states.get(actor.userId);
        if (saved) return saved.state;
        const normalized = { snapshot: initial.snapshot, plan: { ...initial.plan, version: 1, snapshotId: initial.snapshot.id } };
        this.states.set(actor.userId, { state: normalized, commits: new Map() });
        return normalized;
      },
      lookupCommit: async (actor, key, hash) => {
        const found = this.get(actor).commits.get(key);
        if (!found) return null;
        if (found.hash !== hash) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for another change.");
        return found.plan;
      },
      commit: async (actor, expectedVersion, snapshotId, key, hash, plan) => {
        const stored = this.get(actor); const prior = stored.commits.get(key);
        if (prior) {
          if (prior.hash !== hash) throw new AppError(409, "IDEMPOTENCY_CONFLICT", "This idempotency key was already used for another change.");
          return prior.plan;
        }
        if (stored.state.plan.version !== expectedVersion || stored.state.snapshot.id !== snapshotId) throw new AppError(409, "STALE_STATE", "Your preview is stale. Refresh and try again.");
        const saved = { ...plan, version: expectedVersion + 1, snapshotId };
        stored.state = { snapshot: stored.state.snapshot, plan: saved };
        stored.commits.set(key, { hash, plan: saved });
        return saved;
      },
      replaceSnapshot: async (actor, expectedVersion, snapshotId, snapshot) => {
        const stored = this.get(actor);
        if (stored.state.plan.version !== expectedVersion || stored.state.snapshot.id !== snapshotId) throw new AppError(409, "STALE_STATE", "Your preview is stale. Refresh and try again.");
        const plan = { ...stored.state.plan, version: expectedVersion + 1, snapshotId: snapshot.id };
        stored.state = { snapshot, plan };
        return stored.state;
      },
    };
    this.limits = {
      acquire: async (actor, kind, now) => {
        const minute = now.getTime() - 60_000;
        const consume = (scope: string, limit: number) => {
          const values = (this.requests.get(scope) ?? []).filter(time => time > minute);
          if (values.length >= limit) throw new AppError(429, "RATE_LIMITED", "Please wait before trying again.");
          values.push(now.getTime()); this.requests.set(scope, values);
        };
        consume(`${kind}:user:${actor.userId}`, kind === "ai" ? 5 : 60);
        if (kind === "write") return async () => undefined;
        consume(`ai:ip:${actor.ip}`, 20);
        const take = (scope: string, max: number): string => {
          const active = this.leases.get(scope) ?? new Set<string>();
          if (active.size >= max) throw new AppError(429, "RATE_LIMITED", "Please wait before trying again.");
          const id = `${++this.sequence}`; active.add(id); this.leases.set(scope, active); return id;
        };
        const userScope = `ai:user:${actor.userId}`; const userLease = take(userScope, 1);
        let globalLease: string;
        try { globalLease = take("ai:global", 2); } catch (error) { this.leases.get(userScope)?.delete(userLease); throw error; }
        let done = false;
        return async () => {
          if (done) return; done = true;
          this.leases.get(userScope)?.delete(userLease); this.leases.get("ai:global")?.delete(globalLease);
        };
      },
      consumeNonce: async (nonce, expiresAt) => {
        const now = Date.now();
        for (const [value, until] of this.nonces) if (until <= now) this.nonces.delete(value);
        if (!nonce || expiresAt.getTime() <= now || this.nonces.has(nonce)) return false;
        this.nonces.set(nonce, expiresAt.getTime()); return true;
      },
    };
  }
  private get(actor: Actor): Stored {
    const stored = this.states.get(actor.userId);
    if (!stored) throw new AppError(404, "STATE_NOT_FOUND", "No saved plan exists for this guest.");
    return stored;
  }
}

export function testSnapshot(id = "snapshot-1"): Snapshot { return { id, accounts: [], campusBalances: [], universityCharges: [], transactions: [] } as unknown as Snapshot; }
