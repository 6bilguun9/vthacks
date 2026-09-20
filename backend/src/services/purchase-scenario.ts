import { comparePurchaseToGoal, type GoalPurchaseImpact, type GoalProjectionInput } from "../finance/goal-projection.js";
import type { IsoDate } from "../finance/goal-projection.js";
import type { PlanGoalInput } from "../finance/plan-projection.js";
import { previewPlan, type PlanPreview, type PlanPreviewInput } from "./plan-preview.js";

export interface PurchaseDecisionInput {
  readonly id: string;
  readonly purchaseCents: number;
  readonly date: IsoDate;
  readonly discretionaryFundingCents: number;
  readonly discretionaryAvailableCents: number;
  readonly unallocatedFundingCents: number;
  readonly goalId: string | null;
  readonly goalFundingCents?: number;
}

export interface PurchaseScenarioInput {
  readonly preview: PlanPreviewInput;
  readonly decision: PurchaseDecisionInput;
}

export type PurchaseScenarioStatus = "within_budget" | "uses_unallocated_cash" | "requires_goal_change" | "cash_shortfall" | "needs_information" | "baseline_infeasible";

export interface PurchaseScenarioPreview {
  readonly status: PurchaseScenarioStatus;
  readonly before: PlanPreview;
  readonly after: PlanPreview | null;
  readonly goalImpact: GoalPurchaseImpact | null;
  readonly assumptions: readonly string[];
}

function assertSafeInteger(value: number, field: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${field} must be a safe integer of at least ${minimum}.`);
}

function safeAdd(left: number, right: number, field: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new RangeError(`${field} exceeds the supported money range.`);
  return result;
}

function validateDate(value: IsoDate, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError(`${field} must be an ISO calendar date.`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== (month ?? 1) - 1 || date.getUTCDate() !== day) throw new RangeError(`${field} must be a real calendar date.`);
}

function toGoalProjectionInput(goal: PlanGoalInput, preview: PlanPreviewInput): GoalProjectionInput {
  return {
    asOfDate: preview.asOfDate,
    horizonEndDate: preview.horizonEndDate,
    targetCents: goal.targetCents,
    allocatedCents: goal.allocatedCents,
    weeklyContributionCents: goal.weeklyContributionCents,
    contributionStartDate: goal.contributionStartDate,
    targetDate: goal.targetDate,
  };
}

function needsInformation(before: PlanPreview, message: string): PurchaseScenarioPreview {
  return { status: "needs_information", before, after: null, goalImpact: null, assumptions: [message, "This is a preview; no saved plan or account balance was changed."] };
}

/**
 * Compares an explicit funding decision against the current preview. Money
 * already assigned to discretionary spending does not create a second cash
 * outflow. Any unallocated or goal-funded portion becomes a dated hypothetical
 * outflow and the deterministic plan is recomputed before a verdict is shown.
 */
export function previewPurchaseScenario(input: PurchaseScenarioInput): PurchaseScenarioPreview {
  const decision = input.decision;
  if (decision.id.trim().length === 0) throw new RangeError("purchase id cannot be empty.");
  validateDate(decision.date, "purchase date");
  assertSafeInteger(decision.purchaseCents, "purchaseCents", 1);
  assertSafeInteger(decision.discretionaryFundingCents, "discretionaryFundingCents");
  assertSafeInteger(decision.discretionaryAvailableCents, "discretionaryAvailableCents");
  assertSafeInteger(decision.unallocatedFundingCents, "unallocatedFundingCents");
  const goalFundingCents = decision.goalFundingCents ?? 0;
  assertSafeInteger(goalFundingCents, "goalFundingCents");
  if (decision.discretionaryFundingCents > decision.discretionaryAvailableCents) {
    throw new RangeError("discretionaryFundingCents cannot exceed discretionaryAvailableCents.");
  }

  const before = previewPlan(input.preview);
  const totalFundingCents = safeAdd(safeAdd(decision.discretionaryFundingCents, decision.unallocatedFundingCents, "purchase funding"), goalFundingCents, "purchase funding");
  if (totalFundingCents !== decision.purchaseCents) {
    return needsInformation(before, "Choose how the remaining purchase amount would be funded before comparing the plan.");
  }
  if (before.projection.feasibility === "needs_information") {
    return needsInformation(before, "Choose eligible checking or savings cash before checking purchase affordability.");
  }
  if (before.projection.feasibility === "infeasible") {
    return { status: "baseline_infeasible", before, after: null, goalImpact: null, assumptions: ["The current plan already does not protect its cash buffer.", "This is a preview; no saved plan or account balance was changed."] };
  }
  if (goalFundingCents > 0 && decision.goalId === null) {
    return needsInformation(before, "Choose the savings goal that would fund this purchase.");
  }

  let goalImpact: GoalPurchaseImpact | null = null;
  let revisedGoals = input.preview.proposedPlan.goals;
  if (goalFundingCents > 0) {
    const goal = input.preview.proposedPlan.goals.find((candidate) => candidate.id === decision.goalId);
    if (!goal) return needsInformation(before, "The selected savings goal is not in the current plan.");
    const goalScenario = comparePurchaseToGoal({
      goal: toGoalProjectionInput(goal, input.preview),
      purchaseCents: decision.purchaseCents,
      discretionaryFundingCents: decision.discretionaryFundingCents,
      discretionaryAvailableCents: decision.discretionaryAvailableCents,
      unallocatedFundingCents: decision.unallocatedFundingCents,
      goalFundingCents,
    });
    if (goalScenario.status !== "requires_goal_change" || !goalScenario.goalImpact) {
      return needsInformation(before, "Choose complete funding details before comparing the savings goal.");
    }
    goalImpact = goalScenario.goalImpact;
    revisedGoals = input.preview.proposedPlan.goals.map((candidate) => candidate.id === goal.id
      ? { ...candidate, allocatedCents: candidate.allocatedCents - goalFundingCents }
      : candidate);
  }

  const newCashOutflowCents = safeAdd(decision.unallocatedFundingCents, goalFundingCents, "new purchase outflow");
  const after = previewPlan({
    ...input.preview,
    proposedPlan: { ...input.preview.proposedPlan, goals: revisedGoals },
    ...(newCashOutflowCents > 0 ? {
      additionalOutflows: [
        ...(input.preview.additionalOutflows ?? []),
        { id: `__scenario_purchase__${decision.id}`, amountCents: newCashOutflowCents, date: decision.date },
      ],
    } : {}),
  });
  const status: PurchaseScenarioStatus = after.projection.feasibility !== "feasible"
    ? "cash_shortfall"
    : goalFundingCents > 0
      ? "requires_goal_change"
      : decision.unallocatedFundingCents > 0
        ? "uses_unallocated_cash"
        : "within_budget";
  const assumptions = [
    ...(decision.discretionaryFundingCents > 0 ? ["The discretionary portion is already budgeted, so it is not counted as a second cash outflow."] : []),
    ...(newCashOutflowCents > 0 ? ["The unallocated and goal-funded portions are modeled as a dated hypothetical cash outflow."] : []),
    "This is a preview; no saved plan or account balance was changed.",
  ];
  return { status, before, after, goalImpact, assumptions };
}
