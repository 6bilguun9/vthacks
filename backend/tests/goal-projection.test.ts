import { describe, expect, it } from "vitest";
import { comparePurchaseToGoal, projectGoal, type GoalProjectionInput } from "../src/finance/goal-projection.js";

const laptopGoal: GoalProjectionInput = {
  asOfDate: "2026-09-19",
  contributionStartDate: "2026-09-19",
  targetCents: 100_000,
  allocatedCents: 20_000,
  weeklyContributionCents: 10_000,
  targetDate: "2026-11-07",
};

describe("projectGoal", () => {
  it("uses actual weekly contribution dates and checks a preferred deadline", () => {
    const projection = projectGoal(laptopGoal);
    expect(projection).toMatchObject({
      remainingCents: 80_000,
      nextContributionDate: "2026-09-19",
      contributionCount: 8,
      completionDate: "2026-11-07",
      requiredWeeklyCents: 10_000,
      deadlineStatus: "feasible",
      completionStatus: "projected",
    });
  });

  it("does not invent a completion date when the contribution is zero", () => {
    const projection = projectGoal({ ...laptopGoal, weeklyContributionCents: 0 });
    expect(projection).toMatchObject({
      completionDate: null,
      contributionCount: null,
      requiredWeeklyCents: 10_000,
      deadlineStatus: "infeasible",
      completionStatus: "no_contribution",
    });
  });

  it("aligns an old contribution start date to the next real weekly date", () => {
    const projection = projectGoal({
      ...laptopGoal,
      asOfDate: "2026-09-23",
      contributionStartDate: "2026-09-07",
      targetDate: null,
    });
    expect(projection.nextContributionDate).toBe("2026-09-28");
    expect(projection.completionDate).toBe("2026-11-16");
  });

  it("reports no completion inside the two-year horizon instead of fabricating one", () => {
    const projection = projectGoal({ ...laptopGoal, weeklyContributionCents: 1, targetDate: null });
    expect(projection).toMatchObject({ completionDate: null, contributionCount: null, completionStatus: "not_reached_in_horizon" });
  });

  it("checks the horizon before computing a far-future date", () => {
    const projection = projectGoal({ ...laptopGoal, targetCents: Number.MAX_SAFE_INTEGER, allocatedCents: 0, weeklyContributionCents: 1, targetDate: null });
    expect(projection).toMatchObject({ completionDate: null, contributionCount: null, completionStatus: "not_reached_in_horizon" });
  });
});

describe("comparePurchaseToGoal", () => {
  it("keeps the goal date unchanged for a purchase covered by discretionary spending", () => {
    const scenario = comparePurchaseToGoal({
      goal: laptopGoal,
      purchaseCents: 15_000,
      discretionaryFundingCents: 15_000,
      discretionaryAvailableCents: 20_000,
      unallocatedFundingCents: 0,
    });
    expect(scenario).toMatchObject({
      status: "within_discretionary",
      funding: { discretionaryCents: 15_000, unallocatedCents: 0, goalCents: 0 },
      goalImpact: null,
    });
  });

  it("shows the delay and catch-up amounts when the user explicitly funds a purchase from the goal", () => {
    const scenario = comparePurchaseToGoal({
      goal: laptopGoal,
      purchaseCents: 15_000,
      discretionaryFundingCents: 5_000,
      discretionaryAvailableCents: 5_000,
      unallocatedFundingCents: 0,
      goalFundingCents: 10_000,
    });
    expect(scenario).toMatchObject({
      status: "requires_goal_change",
      funding: { discretionaryCents: 5_000, unallocatedCents: 0, goalCents: 10_000 },
      goalImpact: {
        delayDays: 7,
        nextWeekExtraCents: 10_000,
        remainingWeeklyExtraCents: 1_250,
        before: { completionDate: "2026-11-07" },
        after: { completionDate: "2026-11-14" },
      },
    });
  });

  it("requires an explicit funding choice instead of silently reducing the goal", () => {
    const scenario = comparePurchaseToGoal({
      goal: laptopGoal,
      purchaseCents: 15_000,
      discretionaryFundingCents: 5_000,
      discretionaryAvailableCents: 5_000,
      unallocatedFundingCents: 0,
    });
    expect(scenario).toMatchObject({ status: "needs_information", goalImpact: null });
  });

  it("rejects a claim that a purchase uses more discretionary money than remains", () => {
    expect(() => comparePurchaseToGoal({
      goal: laptopGoal,
      purchaseCents: 15_000,
      discretionaryFundingCents: 15_000,
      discretionaryAvailableCents: 5_000,
      unallocatedFundingCents: 0,
    })).toThrow("discretionaryFundingCents");
  });
});
