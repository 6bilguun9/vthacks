import type { Actor, OwnedState, Plan, Snapshot } from "./model.js";

export interface Authenticator { authenticate(authorization: string | undefined, ip: string): Promise<Actor> }
export interface Repository {
  load(actor: Actor): Promise<OwnedState>;
  bootstrap(actor: Actor, state: OwnedState): Promise<OwnedState>;
  lookupCommit(actor: Actor, key: string, payloadHash: string): Promise<Plan | null>;
  commit(actor: Actor, expectedVersion: number, snapshotId: string, key: string, payloadHash: string, plan: Plan): Promise<Plan>;
  replaceSnapshot(actor: Actor, expectedVersion: number, snapshotId: string, snapshot: Snapshot): Promise<OwnedState>;
}
export interface Limits {
  acquire(actor: Actor, kind: "ai" | "write", now: Date): Promise<() => Promise<void>>;
  consumeNonce(nonce: string, expiresAt: Date): Promise<boolean>;
}
