import { AppError, type Actor } from "../domain/model.js";
import type { Limits } from "../domain/ports.js";
import { createHash } from "node:crypto";

export interface SupabaseLimitClient { rpc(name: string, body: Record<string, unknown>): Promise<unknown> }

function limited(): never { throw new AppError(429, "RATE_LIMITED", "Please wait before trying again."); }
function ipScope(ip: string): string { return createHash("sha256").update(ip).digest("hex"); }

export function createSupabaseLimits(client: SupabaseLimitClient): Limits {
  async function rate(scope: string, maximum: number, now: Date): Promise<void> {
    const result = await client.rpc("consume_rate", { p_scope: scope, p_limit: maximum, p_now: now.toISOString() });
    if (result !== true) limited();
  }
  return {
    async acquire(actor: Actor, kind: "ai" | "write", now: Date): Promise<() => Promise<void>> {
      if (kind === "write") {
        await rate(`write:user:${actor.userId}`, 60, now);
        return async () => undefined;
      }
      await rate(`ai:user:${actor.userId}`, 5, now);
      // Do not retain raw IP addresses in the operational-rate table.
      await rate(`ai:ip:${ipScope(actor.ip)}`, 20, now);
      const userLease = await client.rpc("acquire_lease", { p_scope: `ai:user:${actor.userId}`, p_limit: 1, p_now: now.toISOString() });
      if (typeof userLease !== "string") limited();
      const globalLease = await client.rpc("acquire_lease", { p_scope: "ai:global", p_limit: 2, p_now: now.toISOString() });
      if (typeof globalLease !== "string") {
        await client.rpc("release_lease", { p_lease_id: userLease }).catch(() => undefined);
        limited();
      }
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        // Leases expire server-side after 120 seconds. A cleanup failure must not
        // turn an otherwise successful endpoint response into a failure.
        await Promise.allSettled([
          client.rpc("release_lease", { p_lease_id: userLease }),
          client.rpc("release_lease", { p_lease_id: globalLease }),
        ]);
      };
    },
    async consumeNonce(nonce: string, expiresAt: Date): Promise<boolean> {
      if (!nonce || expiresAt.getTime() <= Date.now()) return false;
      return (await client.rpc("consume_nonce", { p_nonce: nonce, p_expires_at: expiresAt.toISOString() })) === true;
    },
  };
}
