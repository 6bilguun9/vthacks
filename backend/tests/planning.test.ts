import { describe, expect, it } from "vitest";
import type { Plan, Snapshot } from "../src/domain/model.js";
import { calculatePlan, calculateScenario } from "../src/services/planning.js";

const now = new Date("2026-09-19T16:00:00-04:00");
const source = { kind: "fixture" as const, asOf: "2026-09-19T12:00:00-04:00", fetchedAt: null, isStale: false };
function state(balanceCents = 25_000, discretionary = 5_000, incomeCents = 15_000): { snapshot: Snapshot; plan: Plan } {
  const snapshot: Snapshot = { id: "snapshot", currency: "USD", source, accounts: [{ id: "checking", customerId: "student", type: "checking", name: "Checking", balanceCents }], campusBalances: [], universityCharges: [], transactions: [] };
  const plan: Plan = {
    id: "plan", version: 1, snapshotId: "snapshot", timezone: "America/New_York", cashBufferCents: 0,
    weeklyDiscretionaryCents: discretionary, discretionaryRemainingCents: discretionary, selectedBankAccountIds: ["checking"], incomeComplete: true, expensesComplete: true,
    discretionaryPeriodStart: "2026-09-14", discretionaryConfirmedAt: "2026-09-19T12:00:00-04:00",
    goals: [{ id: "goal", name: "Laptop", targetCents: 100_000, allocatedCents: 20_000, weeklyContributionCents: 10_000, contributionStartDate: "2026-09-19", targetDate: null }],
    cashFlows: [{ id: "pay", kind: "income", description: "Job", amountCents: incomeCents, cadence: "weekly", nextDate: "2026-09-19", endDate: null, certainty: "confirmed" }],
    plannedPurchases: [], extraContributions: [],
  };
  return { snapshot, plan };
}

describe("planning service", () => {
  it("rejects orphaned goal reservations and detects overcommitted weekly allowances", () => {
    const { snapshot, plan } = state(120_000, 10_000, 30_000);
    const purchase = { id: "first", description: "Planned", amountCents: 10_000, date: "2026-09-20", status: "planned" as const, fundingGoalId: null, matchedTransactionId: null, funding: { discretionaryCents: 0, unallocatedCents: 0, goalCents: 10_000 } };
    expect(() => calculatePlan(snapshot, { ...plan, plannedPurchases: [purchase] }, now)).toThrow("existing goal");
    const budgeted = { ...purchase, funding: { discretionaryCents: 10_000, unallocatedCents: 0, goalCents: 0 } };
    const result = calculatePlan(snapshot, { ...plan, plannedPurchases: [budgeted, { ...budgeted, id: "second" }] }, now);
    expect(result.feasibility).toBe("infeasible");
    expect(result.warnings.join(" ")).toContain("exceed their weekly discretionary allowance");
  });

  it("generates bounded IDs even when the plan and goal IDs use the maximum length", () => {
    const { snapshot, plan } = state(); plan.id = "p".repeat(128); plan.goals[0]!.id = "g".repeat(128);
    const result = calculateScenario(snapshot, plan, { snapshotId: snapshot.id, planVersion: 1, kind: "purchase", amountCents: 15_000, date: "2026-09-20", cadence: "once", goalId: plan.goals[0]!.id }, now);
    expect(result.comparison.status).toBe("requires_goal_change");
    expect(result.proposedPlan.plannedPurchases[0]!.id.length).toBeLessThanOrEqual(128);
  });

  it("forecasts the discretionary allowance once and does not debit a covered purchase twice", () => {
    const { snapshot, plan } = state(120_000, 20_000, 30_000);
    const before = calculatePlan(snapshot, plan, now);
    const result = calculateScenario(snapshot, plan, { snapshotId: snapshot.id, planVersion: 1, kind: "purchase", amountCents: 15_000, date: "2026-09-20", cadence: "once", goalId: null }, now);
    expect(before.goals[0]!.completionDate).toBe("2026-11-07");
    expect(result.comparison).toMatchObject({ status: "within_budget", funding: { discretionaryCents: 15_000, unallocatedCents: 0, goalCents: 0 } });
    expect(result.comparison.after!.goals[0]!.completionDate).toBe("2026-11-07");
  });

  it("uses an explicitly selected goal only after discretionary and safe unallocated cash", () => {
    const { snapshot, plan } = state();
    const result = calculateScenario(snapshot, plan, { snapshotId: snapshot.id, planVersion: 1, kind: "purchase", amountCents: 15_000, date: "2026-09-20", cadence: "once", goalId: "goal" }, now);
    expect(result.comparison).toMatchObject({ status: "requires_goal_change", funding: { discretionaryCents: 5_000, unallocatedCents: 0, goalCents: 10_000 }, goalImpacts: [{ originalDate: "2026-11-07", revisedDate: "2026-11-14", nextWeekExtraCents: 10_000, remainingWeeklyExtraCents: 1_250 }] });
  });

  it("does not replay an old completed purchase and asks for stale inputs to be refreshed", () => {
    const { snapshot, plan } = state();
    const withCompleted: Plan = { ...plan, plannedPurchases: [{ id: "old", description: "Already bought", amountCents: 10_000, date: "2026-09-01", fundingGoalId: null, status: "completed", matchedTransactionId: "transaction", funding: { discretionaryCents: 0, unallocatedCents: 10_000, goalCents: 0 } }] };
    expect(calculatePlan(snapshot, withCompleted, now).feasibility).toBe("feasible");
    const stale: Snapshot = { ...snapshot, source: { ...source, asOf: "2026-09-17T12:00:00-04:00" } };
    expect(calculatePlan(stale, plan, now).feasibility).toBe("needs_information");
  });

  it("does not reuse a weekly allowance after a pending purchase has consumed it", () => {
    const { snapshot, plan } = state();
    const first = calculateScenario(snapshot, plan, { snapshotId: snapshot.id, planVersion: 1, kind: "purchase", amountCents: 5_000, date: "2026-09-20", cadence: "once", goalId: null }, now);
    const second = calculateScenario(snapshot, first.proposedPlan, { snapshotId: snapshot.id, planVersion: 1, kind: "purchase", amountCents: 5_000, date: "2026-09-20", cadence: "once", goalId: "goal" }, now);
    expect(first.comparison.funding.discretionaryCents).toBe(5_000);
    expect(second.comparison.funding.discretionaryCents).toBe(0);
  });

  it("keeps a future extra contribution dated, and uses the partial final contribution for recovery", () => {
    const { snapshot, plan } = state(25_000, 0, 10_000);
    const partial: Plan = { ...plan, goals: [{ ...plan.goals[0]!, targetCents: 100_000, allocatedCents: 25_000 }] };
    const before = calculatePlan(snapshot, partial, now);
    const extra = calculateScenario(snapshot, partial, { snapshotId: snapshot.id, planVersion: 1, kind: "extra_contribution", amountCents: 2_500, date: "2026-10-03", cadence: "once", goalId: "goal" }, now);
    const purchase = calculateScenario(snapshot, partial, { snapshotId: snapshot.id, planVersion: 1, kind: "purchase", amountCents: 10_000, date: "2026-09-20", cadence: "once", goalId: "goal" }, now);
    expect(before.goals[0]!.completionDate).toBe("2026-11-07");
    expect(extra.comparison.goalImpacts[0]!.delayDays).toBeLessThanOrEqual(0);
    expect(purchase.comparison.goalImpacts[0]!.nextWeekExtraCents).toBe(5_000);
    expect(purchase.comparison.goalImpacts[0]!.remainingWeeklyExtraCents).toBe(625);
  });

  it("requires a current discretionary confirmation and a university charge due date", () => {
    const { snapshot, plan } = state();
    expect(calculatePlan(snapshot, { ...plan, discretionaryConfirmedAt: null }, now).feasibility).toBe("needs_information");
    const unknownCharge: Snapshot = { ...snapshot, universityCharges: [{ id: "tuition", name: "Tuition", amountCents: 10_000, dueDate: null, fundingGoalId: null, source }] };
    expect(calculatePlan(unknownCharge, plan, now).feasibility).toBe("needs_information");
  });

  it("distinguishes funded weekly extras from a cash shortfall and stops once the goal is reached", () => {
    const rich = state(120_000, 0, 20_000); const tight = state(20_000, 0, 10_000);
    const request = { snapshotId: "snapshot", planVersion: 1, kind: "extra_contribution" as const, amountCents: 2500, date: "2026-09-19", cadence: "weekly" as const, goalId: "goal" };
    const funded = calculateScenario(rich.snapshot, rich.plan, request, now);
    expect(funded.comparison.status).toBe("uses_unallocated_cash"); expect(funded.comparison.goalImpacts[0]!.delayDays).toBeLessThan(0);
    expect(calculateScenario(tight.snapshot, tight.plan, request, now).comparison.status).toBe("cash_shortfall");
    const late = calculateScenario(rich.snapshot, rich.plan, { ...request, date: "2027-01-01", cadence: "once" }, now);
    expect(late.comparison.after!.minimumUnallocatedCashCents).toBe(late.comparison.before.minimumUnallocatedCashCents);
    expect(late.comparison.goalImpacts[0]!.delayDays).toBe(0);
  });

  it("counts linked tuition once including a contribution on the due date", () => {
    const { snapshot, plan } = state(100_000, 0, 10_000);
    plan.cashFlows = [];
    const tuition: Snapshot = { ...snapshot, universityCharges: [{ id: "tuition", name: "Tuition", amountCents: 100_000, dueDate: "2026-11-07", fundingGoalId: "goal", source }] };
    const result = calculatePlan(tuition, plan, now);
    expect(result.feasibility).toBe("feasible"); expect(result.minimumUnallocatedCashCents).toBe(0);
    expect(calculatePlan({ ...tuition, universityCharges: [...tuition.universityCharges, { ...tuition.universityCharges[0]!, id: "duplicate" }] }, plan, now).feasibility).toBe("infeasible");
  });

  it("does not approve a bill before payday or a goal deadline before the first contribution", () => {
    const { snapshot, plan } = state(20_000, 0, 10_000);
    plan.goals[0]!.contributionStartDate = "2026-09-26";
    plan.cashFlows[0]!.nextDate = "2026-09-21";
    plan.cashFlows.push({ id: "bill", kind: "essential", amountCents: 1000, description: "Due before payday", cadence: "once", nextDate: "2026-09-20", endDate: null, certainty: "confirmed" });
    expect(calculatePlan(snapshot, plan, now).feasibility).toBe("infeasible");
    const deadline = state(120_000, 0, 10_000);
    deadline.plan.goals[0]!.contributionStartDate = "2026-09-26";
    deadline.plan.goals[0]!.targetDate = "2026-09-19";
    expect(calculatePlan(deadline.snapshot, deadline.plan, now).feasibility).toBe("infeasible");
  });

  it("handles zero catch-up and uses the actual saved baseline for repeated goal withdrawals", () => {
    const partial = state(25_000, 0, 10_000); partial.plan.goals[0]!.allocatedCents = 25_000;
    const purchase = { snapshotId: "snapshot", planVersion: 1, kind: "purchase" as const, amountCents: 2500, date: "2026-09-20", cadence: "once" as const, goalId: "goal" };
    const unchanged = calculateScenario(partial.snapshot, partial.plan, purchase, now);
    expect(unchanged.comparison.goalImpacts[0]).toMatchObject({ delayDays: 0, nextWeekExtraCents: 0, remainingWeeklyExtraCents: 0 });
    const base = state(20_000, 0, 10_000);
    const first = calculateScenario(base.snapshot, base.plan, { ...purchase, amountCents: 10000 }, now);
    const second = calculateScenario(base.snapshot, first.proposedPlan, { ...purchase, amountCents: 10000 }, now);
    expect(second.comparison.goalImpacts[0]!.originalDate).toBe(first.comparison.after!.goals[0]!.completionDate);
    expect(second.comparison.goalImpacts[0]!.delayDays).toBe(7);
  });

  it("uses money after a future payday without treating today's low balance as a future shortage", () => {
    const { snapshot, plan } = state(20_000, 0, 20_000);
    plan.cashFlows[0]!.nextDate = "2026-09-21"; plan.goals[0]!.contributionStartDate = "2026-09-26";
    const result = calculateScenario(snapshot, plan, { snapshotId: "snapshot", planVersion: 1, kind: "purchase", amountCents: 1000, date: "2026-09-22", cadence: "once", goalId: null }, now);
    expect(result.comparison.status).toBe("uses_unallocated_cash");
  });

  it("does not claim a future withdrawal can be recovered before the original completion date", () => {
    const { snapshot, plan } = state(20_000, 0, 10_000);
    plan.cashFlows[0]!.endDate = "2026-11-07";
    const result = calculateScenario(snapshot, plan, { snapshotId: "snapshot", planVersion: 1, kind: "purchase", amountCents: 10000, date: "2026-12-20", cadence: "once", goalId: "goal" }, now);
    expect(result.comparison.goalImpacts[0]!.nextWeekExtraCents).toBeNull();
    expect(result.comparison.goalImpacts[0]!.remainingWeeklyExtraCents).toBeNull();
  });
});
