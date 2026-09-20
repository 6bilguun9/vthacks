import { describe, expect, it } from "vitest";
import { projectPlan, type PlanProjectionInput } from "../src/finance/plan-projection.js";

const laptopPlan: PlanProjectionInput = {
  asOfDate: "2026-09-19",
  horizonEndDate: "2026-11-07",
  startingEligibleCashCents: 100_000,
  cashBufferCents: 20_000,
  goals: [{
    id: "laptop",
    targetCents: 100_000,
    allocatedCents: 20_000,
    weeklyContributionCents: 10_000,
    contributionStartDate: "2026-09-19",
    targetDate: "2026-11-07",
  }],
  cashFlows: [],
};

describe("projectPlan", () => {
  it("reserves an existing allocation once and models each remaining goal contribution as a future outflow", () => {
    const result = projectPlan(laptopPlan);

    expect(result).toMatchObject({
      feasibility: "infeasible",
      openingUnallocatedCashCents: 80_000,
      minimumUnallocatedCashCents: -20_000,
      goals: [{ goalId: "laptop", projection: { completionDate: "2026-11-07" } }],
      cashFlow: { status: "buffer_breached", endingEligibleCashCents: 0 },
    });
    const goalEvents = result.cashFlow!.events.filter((event) => event.kind === "goal_contribution");
    expect(goalEvents).toHaveLength(8);
    expect(goalEvents.every((event) => event.amountCents === 10_000)).toBe(true);
  });

  it("keeps the plan feasible when confirmed income funds each scheduled contribution", () => {
    const result = projectPlan({
      ...laptopPlan,
      cashFlows: [{
        id: "job-income",
        kind: "income",
        amountCents: 10_000,
        cadence: "weekly",
        nextDate: "2026-09-19",
        certainty: "confirmed",
      }],
    });

    expect(result).toMatchObject({
      feasibility: "feasible",
      minimumUnallocatedCashCents: 60_000,
      cashFlow: { sameDayOrdering: "income_before_outflows", endingEligibleCashCents: 80_000 },
    });
  });

  it("accepts the public contract's essential cash-flow label and normalizes it for simulation", () => {
    const result = projectPlan({
      ...laptopPlan,
      cashFlows: [{ id: "rent", kind: "essential", amountCents: 5_000, cadence: "once", nextDate: "2026-09-20", certainty: "confirmed" }],
    });

    expect(result.cashFlow!.events.find((event) => event.id === "rent")).toMatchObject({ kind: "essential_expense", deltaCents: -5_000 });
  });

  it("returns needs_information instead of making up a starting balance", () => {
    const result = projectPlan({ ...laptopPlan, startingEligibleCashCents: null });

    expect(result).toMatchObject({ feasibility: "needs_information", cashFlow: null, minimumUnallocatedCashCents: null });
    expect(result.warnings[0]).toContain("Eligible bank cash is missing");
  });

  it("still validates supplied cash flows when eligible cash is missing", () => {
    expect(() => projectPlan({
      ...laptopPlan,
      startingEligibleCashCents: null,
      cashFlows: [{ id: "bad-flow", kind: "income", amountCents: 0, cadence: "once", nextDate: "2026-09-19", certainty: "confirmed" }],
    })).toThrow("bad-flow.amountCents");
  });

  it("includes a hypothetical one-time purchase in cash-flow feasibility without saving it", () => {
    const result = projectPlan({
      ...laptopPlan,
      startingEligibleCashCents: 125_000,
      additionalOutflows: [{ id: "scenario-headphones", amountCents: 10_000, date: "2026-09-20" }],
    });

    expect(result).toMatchObject({ feasibility: "infeasible", minimumUnallocatedCashCents: -5_000 });
    expect(result.cashFlow!.events.find((event) => event.id === "scenario-headphones"))
      .toMatchObject({ kind: "hypothetical_purchase", deltaCents: -10_000 });
  });

  it("reports an infeasible plan if allocations already exceed eligible cash", () => {
    const result = projectPlan({ ...laptopPlan, startingEligibleCashCents: 10_000 });

    expect(result).toMatchObject({
      feasibility: "infeasible",
      openingUnallocatedCashCents: -10_000,
      minimumUnallocatedCashCents: -30_000,
      cashFlow: null,
    });
    expect(result.warnings[0]).toContain("double-reserves");
  });

  it("reports an overdrawn eligible account as infeasible instead of replacing it with zero", () => {
    const result = projectPlan({ ...laptopPlan, startingEligibleCashCents: -5_000, goals: [] });

    expect(result).toMatchObject({
      feasibility: "infeasible",
      openingUnallocatedCashCents: -5_000,
      minimumUnallocatedCashCents: -25_000,
      cashFlow: null,
    });
    expect(result.warnings[0]).toContain("below zero");
  });

  it("labels estimates and incomplete goal savings schedules", () => {
    const result = projectPlan({
      ...laptopPlan,
      goals: [{ ...laptopPlan.goals[0]!, weeklyContributionCents: 0 }],
      cashFlows: [{ id: "side-job", kind: "income", amountCents: 5_000, cadence: "weekly", nextDate: "2026-09-19", certainty: "estimated" }],
    });

    expect(result.warnings).toEqual(expect.arrayContaining([
      "Cash flow side-job is estimated, not guaranteed.",
      "Goal laptop has no confirmed weekly contribution.",
    ]));
  });

  it("keeps modeling contributions within the horizon when a goal cannot be completed there", () => {
    const result = projectPlan({
      asOfDate: "2026-09-19",
      horizonEndDate: "2026-10-03",
      startingEligibleCashCents: 100_000,
      cashBufferCents: 0,
      goals: [{
        id: "long-term",
        targetCents: 1_000_000,
        allocatedCents: 0,
        weeklyContributionCents: 10_000,
        contributionStartDate: "2026-09-19",
        targetDate: null,
      }],
      cashFlows: [],
    });

    expect(result.goals[0]!.projection.completionStatus).toBe("not_reached_in_horizon");
    expect(result.cashFlow!.events.filter((event) => event.kind === "goal_contribution")).toHaveLength(3);
    expect(result.cashFlow!.endingEligibleCashCents).toBe(70_000);
  });

  it("models an exact smaller final contribution instead of over-reserving cash", () => {
    const result = projectPlan({
      ...laptopPlan,
      cashBufferCents: 0,
      goals: [{ ...laptopPlan.goals[0]!, targetCents: 50_100, allocatedCents: 0, weeklyContributionCents: 20_000 }],
    });

    expect(result.cashFlow!.events.filter((event) => event.kind === "goal_contribution").map((event) => event.amountCents))
      .toEqual([20_000, 20_000, 10_100]);
  });

  it("rejects duplicate goal identifiers", () => {
    expect(() => projectPlan({ ...laptopPlan, goals: [laptopPlan.goals[0]!, { ...laptopPlan.goals[0]! }] })).toThrow("goal id laptop must be unique");
  });
});
