import { describe, expect, it } from "vitest";
import { deriveEligibleBankCash } from "../src/services/eligible-bank-cash.js";
import { buildFinancialSnapshot, type FinancialSnapshotInput } from "../src/services/financial-snapshot.js";

const source = { kind: "fixture" as const, asOf: "2026-09-19T19:00:00-04:00", fetchedAt: "2026-09-19T19:00:03-04:00", isStale: false };
const snapshotInput = {
  id: "snapshot-1",
  bankSource: source,
  nessieAccounts: [
    { id: "checking", customerId: "customer", type: "checking", name: "Checking", balanceCents: 100_000 },
    { id: "savings", customerId: "customer", type: "savings", name: "Savings", balanceCents: 25_000 },
    { id: "credit", customerId: "customer", type: "credit", name: "Credit card", balanceCents: -20_000 },
  ],
  campusBalances: [{ id: "dining", name: "Dining Dollars", balanceCents: 50_000, restriction: "Food only", source }],
  universityCharges: [],
} satisfies FinancialSnapshotInput;
const snapshot = buildFinancialSnapshot(snapshotInput);

describe("deriveEligibleBankCash", () => {
  it("requires an explicit selection instead of assuming every visible balance is spendable", () => {
    expect(deriveEligibleBankCash(snapshot, null)).toMatchObject({ status: "needs_information", eligibleCashCents: null });
  });

  it("totals only selected checking and savings accounts", () => {
    expect(deriveEligibleBankCash(snapshot, ["checking", "savings"])).toEqual({
      status: "ready",
      eligibleCashCents: 125_000,
      selectedAccountIds: ["checking", "savings"],
      warnings: [],
    });
  });

  it("does not allow a credit account to become available cash", () => {
    const result = deriveEligibleBankCash(snapshot, ["checking", "credit"]);

    expect(result).toMatchObject({ status: "needs_information", eligibleCashCents: null });
    expect(result.warnings[0]).toContain("credit");
  });

  it("preserves a negative checking balance for the plan engine to report as infeasible", () => {
    const overdrawnSnapshot = buildFinancialSnapshot({ ...snapshotInput, nessieAccounts: [{ ...snapshotInput.nessieAccounts[0]!, balanceCents: -500 }] });
    expect(deriveEligibleBankCash(overdrawnSnapshot, ["checking"])).toMatchObject({ status: "ready", eligibleCashCents: -500 });
  });

  it("rejects duplicate selected IDs instead of double-counting an account", () => {
    expect(() => deriveEligibleBankCash(snapshot, ["checking", "checking"])).toThrow("must be unique");
  });
});
