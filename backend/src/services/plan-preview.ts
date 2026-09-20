import type { IsoDate } from "../finance/goal-projection.js";
import { projectPlan, type AdditionalOutflowInput, type PlanCashFlowInput, type PlanGoalInput, type PlanProjection } from "../finance/plan-projection.js";
import { deriveEligibleBankCash, type EligibleBankCash } from "./eligible-bank-cash.js";
import type { FinancialSnapshot } from "./financial-snapshot.js";

export interface ProposedPlanInput {
  readonly cashBufferCents: number;
  readonly goals: readonly PlanGoalInput[];
  readonly cashFlows: readonly PlanCashFlowInput[];
}

export interface PlanPreviewInput {
  readonly snapshot: FinancialSnapshot;
  readonly selectedBankAccountIds: readonly string[] | null;
  readonly asOfDate: IsoDate;
  readonly horizonEndDate: IsoDate;
  readonly proposedPlan: ProposedPlanInput;
  readonly additionalOutflows?: readonly AdditionalOutflowInput[];
}

export interface PlanPreview {
  readonly eligibleBankCash: EligibleBankCash;
  readonly projection: PlanProjection;
}

/**
 * Runs a pure, non-persistent preview from a frozen financial snapshot. The
 * selected account list is intentionally separate from the plan: it makes the
 * student choose spendable checking/savings cash rather than silently treating
 * all displayed balances as funding.
 */
export function previewPlan(input: PlanPreviewInput): PlanPreview {
  const eligibleBankCash = deriveEligibleBankCash(input.snapshot, input.selectedBankAccountIds);
  const projection = projectPlan({
    asOfDate: input.asOfDate,
    horizonEndDate: input.horizonEndDate,
    startingEligibleCashCents: eligibleBankCash.status === "ready" ? eligibleBankCash.eligibleCashCents : null,
    cashBufferCents: input.proposedPlan.cashBufferCents,
    goals: input.proposedPlan.goals,
    cashFlows: input.proposedPlan.cashFlows,
    ...(input.additionalOutflows ? { additionalOutflows: input.additionalOutflows } : {}),
  });
  return { eligibleBankCash, projection };
}
