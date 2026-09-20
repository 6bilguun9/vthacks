import { describe, expect, it } from "vitest";
import { previewPlan } from "../src/services/plan-preview.js";
import { buildFinancialSnapshot } from "../src/services/financial-snapshot.js";

const source = { kind: "fixture" as const, asOf: "2026-09-19T19:00:00-04:00", fetchedAt: "2026-09-19T19:00:03-04:00", isStale: false };
const snapshot = buildFinancialSnapshot({
  id: "snapshot-1",
  bankSource: source,
  nessieAccounts: [{ id: "checking", customerId: "customer", type: "checking", name: "Checking", balanceCents: 125_000 }],
  campusBalances: [{ id: "dining", name: "Dining Dollars", balanceCents: 50_000, restriction: "Food only", source }],
  universityCharges: [],
});

const proposedPlan = {
  cashBufferCents: 20_000,
  goals: [{ id: "laptop", targetCents: 100_000, allocatedCents: 20_000, weeklyContributionCents: 10_000, contributionStartDate: "2026-09-19" as const, targetDate: "2026-11-07" as const }],
  cashFlows: [],
};

describe("previewPlan", () => {
  it("calculates from an explicitly selected account without mutating the snapshot or plan", () => {
    const result = previewPlan({ snapshot, selectedBankAccountIds: ["checking"], asOfDate: "2026-09-19", horizonEndDate: "2026-11-07", proposedPlan });

    expect(result).toMatchObject({
      eligibleBankCash: { status: "ready", eligibleCashCents: 125_000 },
      projection: { feasibility: "feasible", openingUnallocatedCashCents: 105_000, minimumUnallocatedCashCents: 5_000 },
    });
    expect(snapshot.accounts[0]!.balanceCents).toBe(125_000);
    expect(proposedPlan.goals[0]!.allocatedCents).toBe(20_000);
  });

  it("returns needs_information when the student has not selected usable bank cash", () => {
    const result = previewPlan({ snapshot, selectedBankAccountIds: null, asOfDate: "2026-09-19", horizonEndDate: "2026-11-07", proposedPlan });

    expect(result).toMatchObject({
      eligibleBankCash: { status: "needs_information", eligibleCashCents: null },
      projection: { feasibility: "needs_information", minimumUnallocatedCashCents: null },
    });
  });
});
