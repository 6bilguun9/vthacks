import { describe, expect, it } from "vitest";
import { MemoryInfrastructure } from "./helpers/memory.js";
import { createSupabaseLimits } from "../src/limits/supabase.js";

describe("limits", () => {
  it("enforces rates, releases leases idempotently, and rejects nonce replay", async () => {
    const infrastructure = new MemoryInfrastructure({ token: "guest" });
    const actor = await infrastructure.auth.authenticate("Bearer token", "ip");
    const now = new Date("2026-09-19T12:00:00.000Z");
    const release = await infrastructure.limits.acquire(actor, "ai", now);
    await expect(infrastructure.limits.acquire(actor, "ai", now)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await release(); await release();
    const nonceExpiry = new Date(Date.now() + 1_000);
    await expect(infrastructure.limits.consumeNonce("nonce", nonceExpiry)).resolves.toBe(true);
    await expect(infrastructure.limits.consumeNonce("nonce", nonceExpiry)).resolves.toBe(false);
  });

  it("caps writes at sixty per guest per minute", async () => {
    const infrastructure = new MemoryInfrastructure({ token: "guest" }); const actor = await infrastructure.auth.authenticate("Bearer token", "ip"); const now = new Date();
    for (let count = 0; count < 60; count++) await infrastructure.limits.acquire(actor, "write", now);
    await expect(infrastructure.limits.acquire(actor, "write", now)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("hashes persisted IP scopes and treats failed lease cleanup as non-fatal", async () => {
    const calls: Array<{ name: string; body: Record<string, unknown> }> = [];
    const limits = createSupabaseLimits({ rpc: async (name, body) => {
      calls.push({ name, body });
      if (name === "consume_rate") return true;
      if (name === "acquire_lease") return calls.filter(call => call.name === "acquire_lease").length === 1 ? "user-lease" : "global-lease";
      throw new Error("cleanup network outage");
    } });
    const release = await limits.acquire({ userId: "guest", token: "token", ip: "203.0.113.8" }, "ai", new Date());
    await expect(release()).resolves.toBeUndefined();
    const ipScope = calls.find(call => call.name === "consume_rate" && String(call.body.p_scope).startsWith("ai:ip:"))?.body.p_scope;
    expect(ipScope).toMatch(/^ai:ip:[a-f0-9]{64}$/);
    expect(ipScope).not.toContain("203.0.113.8");
  });
});
