import { z } from "zod";
import type { FinancialSnapshot } from "../services/financial-snapshot.js";

export const money = z.number().int().nonnegative().safe();
export const date = z.string().date();
const id = z.string().trim().min(1).max(128);
export const goalSchema = z.object({ id, name: z.string().trim().min(1).max(100), targetCents: money.positive(), allocatedCents: money, weeklyContributionCents: money, contributionStartDate: date, targetDate: date.nullable() }).strict();
export const cashFlowSchema = z.object({ id, kind: z.enum(["income", "essential"]), description: z.string().max(200), amountCents: money.positive(), cadence: z.enum(["once", "weekly", "biweekly", "monthly"]), nextDate: date, endDate: date.nullable(), certainty: z.enum(["estimated", "confirmed"]) }).strict();
export const fundingSchema = z.object({ discretionaryCents: money, unallocatedCents: money, goalCents: money }).strict();
export const plannedPurchaseSchema = z.object({ id, description: z.string().max(200), amountCents: money.positive(), date, createdAt: z.string().datetime({ offset: true }).optional(), fundingGoalId: id.nullable(), status: z.enum(["planned", "completed", "canceled", "needs_reconciliation"]), matchedTransactionId: id.nullable(), funding: fundingSchema }).strict();
export const planSchema = z.object({
  id, version: z.number().int().positive().safe(), snapshotId: id, timezone: z.literal("America/New_York"),
  cashBufferCents: money, weeklyDiscretionaryCents: money, discretionaryRemainingCents: money,
  selectedBankAccountIds: z.array(id).max(20).nullable(), incomeComplete: z.boolean(), expensesComplete: z.boolean(),
  discretionaryPeriodStart: date, discretionaryConfirmedAt: z.string().datetime({ offset: true }).nullable(),
  goals: z.array(goalSchema).max(20), cashFlows: z.array(cashFlowSchema).max(100), plannedPurchases: z.array(plannedPurchaseSchema).max(100),
  extraContributions: z.array(z.object({ id, goalId: id, amountCents: money.positive(), date, cadence: z.enum(["once", "weekly"]), endDate: date.optional() }).strict()).max(100),
}).strict();
export type Plan = z.infer<typeof planSchema>;
export type Funding = z.infer<typeof fundingSchema>;
export const scenarioSchema = z.object({ snapshotId: id, planVersion: z.number().int().positive().safe(), kind: z.enum(["purchase", "extra_contribution"]), amountCents: money.positive(), date, cadence: z.enum(["once", "weekly"]), goalId: id.nullable() }).strict().refine(v => v.kind !== "purchase" || v.cadence === "once", "Purchases must be one-time.");
export type ScenarioRequest = z.infer<typeof scenarioSchema>;
export interface Transaction { id: string; accountId: string; date: string; amountCents: number; status: string; description: string | null; source: "nessie_sandbox" | "fixture" }
export interface Snapshot extends FinancialSnapshot { readonly transactions: readonly Transaction[] }
export interface Projection { asOf: string; horizonEnd: string; feasibility: "feasible" | "infeasible" | "needs_information"; minimumUnallocatedCashCents: number | null; goals: { goalId: string; completionDate: string | null; requiredWeeklyCents: number | null }[]; assumptions: string[]; warnings: string[] }
export interface GoalImpact { goalId: string; originalDate: string | null; revisedDate: string | null; delayDays: number | null; nextWeekExtraCents: number | null; remainingWeeklyExtraCents: number | null; nextWeekAffordable: boolean | null; remainingWeeklyAffordable: boolean | null }
export interface ScenarioComparison { scenarioId: string; snapshotId: string; planVersion: number; status: "within_budget" | "uses_unallocated_cash" | "requires_goal_change" | "cash_shortfall" | "needs_information" | "baseline_infeasible"; before: Projection; after: Projection | null; funding: Funding; goalImpacts: GoalImpact[]; assumptions: string[] }
export interface OwnedState { snapshot: Snapshot; plan: Plan }
export interface Actor { userId: string; token: string; ip: string }
export const chatSchema = z.object({ message: z.string().trim().min(1).max(2000), snapshotId: id, planVersion: z.number().int().positive().safe(), selectedGoalId: id.nullable() }).strict();
export type ChatRequest = z.infer<typeof chatSchema>;
export interface ChatResponse { kind: "clarification" | "comparison" | "explanation"; text: string; comparison: ScenarioComparison | null; executionSource: "ans_remote" | "local_fallback" | "unavailable" }
export const previewSchema = z.object({ expectedVersion: z.number().int().positive().safe(), snapshotId: id, proposedPlan: planSchema }).strict();
export const commitSchema = z.object({ expectedVersion: z.number().int().positive().safe(), snapshotId: id, idempotencyKey: id, change: z.discriminatedUnion("kind", [z.object({ kind: z.literal("replace_plan"), plan: planSchema }).strict(), z.object({ kind: z.literal("apply_scenario"), scenario: scenarioSchema }).strict(), z.object({ kind: z.literal("reconcile_purchase"), purchaseId: id, transactionId: id.nullable(), action: z.enum(["match", "cancel"]) }).strict()]) }).strict();
export const manualSchema = z.object({ expectedVersion: z.number().int().positive().safe(), snapshotId: id, campusBalances: z.array(z.object({ id, name: z.string().min(1).max(100), balanceCents: money, restriction: z.string().min(1).max(200), asOf: z.string().datetime({ offset: true }) }).strict()).max(20), universityCharges: z.array(z.object({ id, name: z.string().min(1).max(100), amountCents: money, dueDate: date.nullable(), fundingGoalId: id.nullable(), asOf: z.string().datetime({ offset: true }) }).strict()).max(100) }).strict();

export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) { super(message); this.name = "AppError"; }
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}
