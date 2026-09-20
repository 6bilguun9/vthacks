import { describe, expect, it } from "vitest";
import { previewPurchaseScenario } from "../src/services/purchase-scenario.js";
import { buildFinancialSnapshot } from "../src/services/financial-snapshot.js";

const source = { kind: "fixture" as const, asOf: "2026-09-19T19:00:00-04:00", fetchedAt: "2026-09-19T19:00:03-04:00", isStale: false };
const snapshot = buildFinancialSnapshot({
  id: "snapshot-1",
  bankSource: source,
  nessieAccounts: [{ id: "checking", customerId: "customer", type: "checking", name: "Checking", balanceCents: 170_000 }],
  campusBalances: [],
  universityCharges: [],
});
const preview = {
  snapshot,
  selectedBankAccountIds: ["checking"],
  asOfDate: "2026-09-19" as const,
  horizonEndDate: "2026-11-21" as const,
  proposedPlan: {
    cashBufferCents: 20_000,
    goals: [{ id: "laptop", targetCents: 100_000, allocatedCents: 20_000, weeklyContributionCents: 10_000, contributionStartDate: "2026-09-19" as const, targetDate: "2026-11-07" as const }],
    cashFlows: [],
  },
};

describe("previewPurchaseScenario", () => {
  it("does not delay a goal when the purchase is covered by already-budgeted discretionary money", () => {
    const result = previewPurchaseScenario({ preview, decision: { id: "headphones", purchaseCents: 15_000, date: "2026-09-20", discretionaryFundingCents: 15_000, discretionaryAvailableCents: 20_000, unallocatedFundingCents: 0, goalId: null } });

    expect(result).toMatchObject({
      status: "within_budget",
      goalImpact: null,
      before: { projection: { minimumUnallocatedCashCents: 50_000 } },
      after: { projection: { minimumUnallocatedCashCents: 50_000 } },
    });
    expect(result.assumptions[0]).toContain("already budgeted");
  });

  it("shows a goal's revised completion date and delay when explicitly goal-funded", () => {
    const result = previewPurchaseScenario({ preview, decision: { id: "headphones", purchaseCents: 10_000, date: "2026-09-20", discretionaryFundingCents: 5_000, discretionaryAvailableCents: 5_000, unallocatedFundingCents: 0, goalId: "laptop", goalFundingCents: 5_000 } });

    expect(result).toMatchObject({
      status: "requires_goal_change",
      goalImpact: {
        delayDays: 7,
        nextWeekExtraCents: 5_000,
        remainingWeeklyExtraCents: 625,
        before: { completionDate: "2026-11-07" },
        after: { completionDate: "2026-11-14" },
      },
      after: { projection: { feasibility: "feasible" } },
    });
  });

  it("reports a cash shortfall when an unallocated purchase breaks the buffer", () => {
    const result = previewPurchaseScenario({ preview, decision: { id: "weekend", purchaseCents: 60_000, date: "2026-09-20", discretionaryFundingCents: 0, discretionaryAvailableCents: 0, unallocatedFundingCents: 60_000, goalId: null } });

    expect(result).toMatchObject({ status: "cash_shortfall", after: { projection: { feasibility: "infeasible" } } });
  });

  it("asks for funding details instead of assigning the uncovered amount to a goal", () => {
    const result = previewPurchaseScenario({ preview, decision: { id: "weekend", purchaseCents: 15_000, date: "2026-09-20", discretionaryFundingCents: 5_000, discretionaryAvailableCents: 5_000, unallocatedFundingCents: 0, goalId: null } });

    expect(result).toMatchObject({ status: "needs_information", after: null, goalImpact: null });
  });
});
