import { describe, expect, it } from "vitest";
import { buildFinancialSnapshot, type FinancialSnapshotInput } from "../src/services/financial-snapshot.js";

const nessieSource = { kind: "nessie_sandbox" as const, asOf: "2026-09-19T19:00:00-04:00", fetchedAt: "2026-09-19T19:00:03-04:00", isStale: false };
const manualSource = { kind: "manual" as const, asOf: "2026-09-19T19:01:00-04:00", fetchedAt: null, isStale: false };
const input: FinancialSnapshotInput = {
  id: "snapshot-1",
  bankSource: nessieSource,
  nessieAccounts: [{ id: "checking-1", customerId: "customer-1", type: "checking", name: "Checking", balanceCents: 125_000 }],
  campusBalances: [{ id: "dining-1", name: "Dining Dollars", balanceCents: 20_000, restriction: "Food purchases only", source: manualSource }],
  universityCharges: [{ id: "tuition-1", name: "Spring tuition", amountCents: 500_000, dueDate: "2027-01-15", fundingGoalId: "tuition-goal", source: manualSource }],
};

describe("buildFinancialSnapshot", () => {
  it("keeps bank cash, restricted campus funds, and charges in separate collections with source freshness", () => {
    const snapshot = buildFinancialSnapshot(input);

    expect(snapshot).toEqual({
      id: "snapshot-1",
      currency: "USD",
      source: nessieSource,
      accounts: input.nessieAccounts,
      campusBalances: input.campusBalances,
      universityCharges: input.universityCharges,
    });
    expect(snapshot.accounts[0]!.balanceCents).toBe(125_000);
    expect(snapshot.campusBalances[0]!.restriction).toBe("Food purchases only");
    expect(snapshot.universityCharges[0]!.amountCents).toBe(500_000);
  });

  it("does not accept duplicated bank IDs or sources that would mislabel campus information as bank data", () => {
    expect(() => buildFinancialSnapshot({ ...input, nessieAccounts: [input.nessieAccounts[0]!, input.nessieAccounts[0]!] })).toThrow("bank account IDs must be unique");
    expect(() => buildFinancialSnapshot({ ...input, campusBalances: [{ ...input.campusBalances[0]!, source: nessieSource }] })).toThrow("campus balance dining-1.source.kind");
  });

  it("requires offset-aware freshness timestamps and real due dates", () => {
    expect(() => buildFinancialSnapshot({ ...input, bankSource: { ...nessieSource, asOf: "2026-09-19T19:00:00" } })).toThrow("bankSource.asOf");
    expect(() => buildFinancialSnapshot({ ...input, universityCharges: [{ ...input.universityCharges[0]!, dueDate: "2026-02-30" }] })).toThrow("dueDate");
  });
});
