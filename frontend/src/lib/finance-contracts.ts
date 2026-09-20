import { z } from "zod";

// Browser-owned copies of the v1 contracts. No backend source is bundled here.
export const moneySchema = z.number().int().nonnegative().safe();
const signedMoney = z.number().int().safe();
const date = z.string().date();
const timestamp = z.string().datetime({ offset: true });
const id = z.string().trim().min(1).max(128);
const version = z.number().int().positive().safe();

export const goalSchema = z.object({
  id, name: z.string().trim().min(1).max(100), targetCents: moneySchema.positive(),
  allocatedCents: moneySchema, weeklyContributionCents: moneySchema,
  contributionStartDate: date, targetDate: date.nullable(),
}).strict();
export const cashFlowSchema = z.object({
  id, kind: z.enum(["income", "essential"]), description: z.string().max(200),
  amountCents: moneySchema.positive(), cadence: z.enum(["once", "weekly", "biweekly", "monthly"]),
  nextDate: date, endDate: date.nullable(), certainty: z.enum(["estimated", "confirmed"]),
}).strict();
export const fundingSchema = z.object({
  discretionaryCents: moneySchema, unallocatedCents: moneySchema, goalCents: moneySchema,
}).strict();
const plannedPurchaseSchema = z.object({
  id, description: z.string().max(200), amountCents: moneySchema.positive(), date,
  createdAt: timestamp.optional(), fundingGoalId: id.nullable(),
  status: z.enum(["planned", "completed", "canceled", "needs_reconciliation"]),
  matchedTransactionId: id.nullable(), funding: fundingSchema,
}).strict();
export const planSchema = z.object({
  id, version, snapshotId: id, timezone: z.literal("America/New_York"),
  cashBufferCents: moneySchema, weeklyDiscretionaryCents: moneySchema, discretionaryRemainingCents: moneySchema,
  selectedBankAccountIds: z.array(id).max(20).nullable(), incomeComplete: z.boolean(), expensesComplete: z.boolean(),
  discretionaryPeriodStart: date, discretionaryConfirmedAt: timestamp.nullable(),
  goals: z.array(goalSchema).max(20), cashFlows: z.array(cashFlowSchema).max(100),
  plannedPurchases: z.array(plannedPurchaseSchema).max(100),
  extraContributions: z.array(z.object({
    id, goalId: id, amountCents: moneySchema.positive(), date,
    cadence: z.enum(["once", "weekly"]), endDate: date.optional(),
  }).strict()).max(100),
}).strict();

export const sourceInfoSchema = z.object({
  kind: z.enum(["nessie_sandbox", "manual", "fixture"]), asOf: timestamp,
  fetchedAt: timestamp.nullable(), isStale: z.boolean(),
}).strict();
export const financialSnapshotSchema = z.object({
  id, currency: z.literal("USD"), source: sourceInfoSchema,
  accounts: z.array(z.object({
    id: z.string(), name: z.string(), type: z.enum(["checking", "savings", "credit"]), balanceCents: signedMoney,
  }).strict()),
  campusBalances: z.array(z.object({
    id: z.string(), name: z.string(), balanceCents: signedMoney, restriction: z.string(), source: sourceInfoSchema,
  }).strict()),
  universityCharges: z.array(z.object({
    id: z.string(), name: z.string(), amountCents: moneySchema, dueDate: date.nullable(),
    fundingGoalId: z.string().nullable(), source: sourceInfoSchema,
  }).strict()),
  transactions: z.array(z.object({
    id: z.string(), accountId: z.string(), date, amountCents: moneySchema, status: z.string(),
    description: z.string().nullable(), source: z.enum(["nessie_sandbox", "fixture"]),
  }).strict()),
}).strict();
export const projectionSchema = z.object({
  asOf: date, horizonEnd: date, feasibility: z.enum(["feasible", "infeasible", "needs_information"]),
  minimumUnallocatedCashCents: signedMoney.nullable(),
  goals: z.array(z.object({
    goalId: z.string(), completionDate: date.nullable(), requiredWeeklyCents: moneySchema.nullable(),
  }).strict()),
  assumptions: z.array(z.string()), warnings: z.array(z.string()),
}).strict();
export const ownedStateSchema = z.object({ snapshot: financialSnapshotSchema, plan: planSchema }).strict();
export const overviewResponseSchema = ownedStateSchema.extend({
  projection: projectionSchema,
  // Optional in the published v1 contract; absence never grants AI access.
  capabilities: z.object({ ai: z.boolean(), nessieConfigured: z.boolean(), today: date }).strict().optional(),
}).strict();

export const scenarioRequestSchema = z.object({
  snapshotId: id, planVersion: version, kind: z.enum(["purchase", "extra_contribution"]),
  amountCents: moneySchema.positive(), date, cadence: z.enum(["once", "weekly"]), goalId: id.nullable(),
}).strict().refine(value => value.kind !== "purchase" || value.cadence === "once", "Purchases must be one-time.");
export const scenarioComparisonSchema = z.object({
  scenarioId: z.string(), snapshotId: z.string(), planVersion: version,
  status: z.enum(["within_budget", "uses_unallocated_cash", "requires_goal_change", "cash_shortfall", "needs_information", "baseline_infeasible"]),
  before: projectionSchema, after: projectionSchema.nullable(), funding: fundingSchema,
  goalImpacts: z.array(z.object({
    goalId: z.string(), originalDate: date.nullable(), revisedDate: date.nullable(), delayDays: signedMoney.nullable(),
    nextWeekExtraCents: moneySchema.nullable(), remainingWeeklyExtraCents: moneySchema.nullable(),
    nextWeekAffordable: z.boolean().nullable(), remainingWeeklyAffordable: z.boolean().nullable(),
  }).strict()),
  assumptions: z.array(z.string()),
}).strict();
export const planPreviewRequestSchema = z.object({ expectedVersion: version, snapshotId: id, proposedPlan: planSchema }).strict();
export const planPreviewResponseSchema = z.object({ proposedPlan: planSchema, projection: projectionSchema }).strict();
export const commitRequestSchema = z.object({
  expectedVersion: version, snapshotId: id, idempotencyKey: id,
  change: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("replace_plan"), plan: planSchema }).strict(),
    z.object({ kind: z.literal("apply_scenario"), scenario: scenarioRequestSchema }).strict(),
    z.object({
      kind: z.literal("reconcile_purchase"), purchaseId: id,
      transactionId: id.nullable(), action: z.enum(["match", "cancel"]),
    }).strict(),
  ]),
}).strict();
export const manualRequestSchema = z.object({
  expectedVersion: version, snapshotId: id,
  campusBalances: z.array(z.object({
    id, name: z.string().min(1).max(100), balanceCents: moneySchema,
    restriction: z.string().min(1).max(200), asOf: timestamp,
  }).strict()).max(20),
  universityCharges: z.array(z.object({
    id, name: z.string().min(1).max(100), amountCents: moneySchema,
    dueDate: date.nullable(), fundingGoalId: id.nullable(), asOf: timestamp,
  }).strict()).max(100),
}).strict();
export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000), snapshotId: id,
  planVersion: version, selectedGoalId: id.nullable(),
}).strict();
export const chatResponseSchema = z.object({
  kind: z.enum(["clarification", "comparison", "explanation"]), text: z.string(),
  comparison: scenarioComparisonSchema.nullable(), executionSource: z.enum(["ans_remote", "local_fallback", "unavailable"]),
}).strict().refine(value => value.kind !== "comparison" || value.comparison !== null, "A comparison reply requires calculated results.");

export type Goal = z.infer<typeof goalSchema>;
export type CashFlow = z.infer<typeof cashFlowSchema>;
export type Plan = z.infer<typeof planSchema>;
export type FinancialSnapshot = z.infer<typeof financialSnapshotSchema>;
export type Projection = z.infer<typeof projectionSchema>;
export type OwnedState = z.infer<typeof ownedStateSchema>;
export type OverviewResponse = z.infer<typeof overviewResponseSchema>;
export type ScenarioRequest = z.infer<typeof scenarioRequestSchema>;
export type ScenarioComparison = z.infer<typeof scenarioComparisonSchema>;
export type PlanPreviewRequest = z.infer<typeof planPreviewRequestSchema>;
export type PlanPreviewResponse = z.infer<typeof planPreviewResponseSchema>;
export type CommitRequest = z.infer<typeof commitRequestSchema>;
export type ManualRequest = z.infer<typeof manualRequestSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
