import { describe, expect, it } from "vitest";
import { AppError, type Plan } from "../src/domain/model.js";
import { MemoryInfrastructure, testSnapshot } from "./helpers/memory.js";

const plan = (snapshotId: string, version = 1) => ({ id: "current", version, snapshotId, timezone: "America/New_York", cashBufferCents: 0, weeklyDiscretionaryCents: 0, discretionaryRemainingCents: 0, selectedBankAccountIds: null, incomeComplete: false, expensesComplete: false, discretionaryPeriodStart: "2026-09-19", discretionaryConfirmedAt: null, goals: [], cashFlows: [], plannedPurchases: [], extraContributions: [] }) satisfies Plan;

describe("memory persistence contract", () => {
  it("isolates owners and makes retries win before stale CAS comparisons", async () => {
    const infrastructure = new MemoryInfrastructure({ one: "owner-one", two: "owner-two" });
    const one = await infrastructure.auth.authenticate("Bearer one", "ip");
    const two = await infrastructure.auth.authenticate("Bearer two", "ip");
    await infrastructure.repository.bootstrap(one, { snapshot: testSnapshot("s-1"), plan: plan("s-1") });
    await expect(infrastructure.repository.load(two)).rejects.toMatchObject({ statusCode: 404 });
    const committed = await infrastructure.repository.commit(one, 1, "s-1", "retry", "hash-a", plan("s-1"));
    expect(committed.version).toBe(2);
    await expect(infrastructure.repository.commit(one, 1, "s-1", "retry", "hash-a", plan("s-1"))).resolves.toEqual(committed);
    await expect(infrastructure.repository.commit(one, 1, "s-1", "retry", "hash-b", plan("s-1"))).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" } satisfies Partial<AppError>);
    await expect(infrastructure.repository.commit(one, 1, "s-1", "new", "hash", plan("s-1"))).rejects.toMatchObject({ code: "STALE_STATE" });
  });

  it("binds the new snapshot and plan version atomically", async () => {
    const infrastructure = new MemoryInfrastructure({ one: "owner-one" });
    const actor = await infrastructure.auth.authenticate("Bearer one", "ip");
    await infrastructure.repository.bootstrap(actor, { snapshot: testSnapshot("s-1"), plan: plan("s-1") });
    const replaced = await infrastructure.repository.replaceSnapshot(actor, 1, "s-1", testSnapshot("s-2"));
    expect(replaced.plan).toMatchObject({ version: 2, snapshotId: "s-2" });
    await expect(infrastructure.repository.commit(actor, 1, "s-1", "old", "hash", plan("s-1"))).rejects.toMatchObject({ code: "STALE_STATE" });
  });
});
