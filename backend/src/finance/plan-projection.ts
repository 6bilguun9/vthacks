import { simulateCashFlow, type CashFlowCadence, type CashFlowSimulation, type PlannedCashFlow } from "./cash-flow.js";
import { projectGoal, type GoalProjection, type IsoDate } from "./goal-projection.js";

export interface PlanGoalInput {
  readonly id: string;
  readonly targetCents: number;
  readonly allocatedCents: number;
  readonly weeklyContributionCents: number;
  readonly contributionStartDate: IsoDate;
  readonly targetDate: IsoDate | null;
}

export interface PlanCashFlowInput {
  readonly id: string;
  /** Matches the public Plan.cashFlows contract; the engine normalizes it internally. */
  readonly kind: "income" | "essential";
  readonly amountCents: number;
  readonly cadence: CashFlowCadence;
  readonly nextDate: IsoDate;
  readonly endDate?: IsoDate;
  readonly certainty: "confirmed" | "estimated";
}

/** A non-persistent outflow used only while comparing a hypothetical decision. */
export interface AdditionalOutflowInput {
  readonly id: string;
  readonly amountCents: number;
  readonly date: IsoDate;
}

export interface PlanProjectionInput {
  readonly asOfDate: IsoDate;
  /** Inclusive; the MVP intentionally limits forecasts to two years. */
  readonly horizonEndDate: IsoDate;
  /** Current plan-eligible bank cash. Null means the snapshot does not provide it. */
  readonly startingEligibleCashCents: number | null;
  readonly cashBufferCents: number;
  readonly goals: readonly PlanGoalInput[];
  readonly cashFlows: readonly PlanCashFlowInput[];
  readonly additionalOutflows?: readonly AdditionalOutflowInput[];
}

export interface ProjectedGoal {
  readonly goalId: string;
  readonly projection: GoalProjection;
}

export interface PlanProjection {
  readonly feasibility: "feasible" | "infeasible" | "needs_information";
  /** Current cash minus existing goal reservations, before the cash buffer. */
  readonly openingUnallocatedCashCents: number | null;
  /** Minimum cash remaining after existing allocations and the configured buffer. */
  readonly minimumUnallocatedCashCents: number | null;
  readonly goals: readonly ProjectedGoal[];
  readonly cashFlow: CashFlowSimulation | null;
  readonly assumptions: readonly string[];
  readonly warnings: readonly string[];
}

const millisecondsPerDay = 86_400_000;

function assertSafeInteger(value: number, field: string, minimum?: number): void {
  if (!Number.isSafeInteger(value) || (minimum !== undefined && value < minimum)) {
    const minimumMessage = minimum === undefined ? "" : ` of at least ${minimum}`;
    throw new RangeError(`${field} must be a safe integer${minimumMessage}.`);
  }
}

function parseIsoDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError(`${field} must be an ISO calendar date.`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== (month ?? 1) - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`${field} must be a real calendar date.`);
  }
  return date;
}

function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10) as IsoDate;
}

function dayDifference(start: IsoDate, end: IsoDate): number {
  return Math.round((parseIsoDate(end, "end date").getTime() - parseIsoDate(start, "start date").getTime()) / millisecondsPerDay);
}

function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isSafeInteger(days) || days < 0) throw new RangeError("days must be a non-negative safe integer.");
  return toIsoDate(new Date(parseIsoDate(date, "date").getTime() + days * millisecondsPerDay));
}

function safeAdd(left: number, right: number, field: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new RangeError(`${field} exceeds the supported money range.`);
  return result;
}

function safeMultiply(left: number, right: number, field: string): number {
  const result = left * right;
  if (!Number.isSafeInteger(result)) throw new RangeError(`${field} exceeds the supported money range.`);
  return result;
}

function validateGoalIds(goals: readonly PlanGoalInput[]): void {
  const ids = new Set<string>();
  for (const goal of goals) {
    if (goal.id.trim().length === 0) throw new RangeError("goal id cannot be empty.");
    if (ids.has(goal.id)) throw new RangeError(`goal id ${goal.id} must be unique.`);
    ids.add(goal.id);
  }
}

function projectGoals(input: PlanProjectionInput): ProjectedGoal[] {
  validateGoalIds(input.goals);
  return input.goals.map((goal) => ({
    goalId: goal.id,
    projection: projectGoal({
      asOfDate: input.asOfDate,
      horizonEndDate: input.horizonEndDate,
      targetCents: goal.targetCents,
      allocatedCents: goal.allocatedCents,
      weeklyContributionCents: goal.weeklyContributionCents,
      contributionStartDate: goal.contributionStartDate,
      targetDate: goal.targetDate,
    }),
  }));
}

function goalContributionFlows(goals: readonly PlanGoalInput[], projections: readonly ProjectedGoal[]): PlannedCashFlow[] {
  const byGoalId = new Map(projections.map((item) => [item.goalId, item.projection]));
  const flows: PlannedCashFlow[] = [];

  for (const goal of goals) {
    const projection = byGoalId.get(goal.id);
    if (!projection?.nextContributionDate || goal.weeklyContributionCents === 0) continue;

    const remainingCents = goal.targetCents - goal.allocatedCents;
    const contributionsInHorizon = Math.floor(dayDifference(projection.nextContributionDate, projection.horizonEndDate) / 7) + 1;
    const contributionCount = projection.contributionCount ?? contributionsInHorizon;
    for (let occurrence = 0; occurrence < contributionCount; occurrence += 1) {
      const alreadyContributedCents = safeMultiply(goal.weeklyContributionCents, occurrence, `${goal.id} contribution total`);
      const amountCents = Math.min(goal.weeklyContributionCents, remainingCents - alreadyContributedCents);
      flows.push({
        id: `__goal_contribution__${goal.id}__${occurrence + 1}`,
        kind: "goal_contribution",
        amountCents,
        cadence: "once",
        nextDate: addDays(projection.nextContributionDate, occurrence * 7),
      });
    }
  }
  return flows;
}

function sumAllocatedCents(goals: readonly PlanGoalInput[]): number {
  return goals.reduce((total, goal) => safeAdd(total, goal.allocatedCents, "combined goal allocations"), 0);
}

function validateCashFlows(cashFlows: readonly PlanCashFlowInput[]): Set<string> {
  const ids = new Set<string>();
  for (const flow of cashFlows) {
    if (flow.id.trim().length === 0) throw new RangeError("cash-flow id cannot be empty.");
    if (ids.has(flow.id)) throw new RangeError(`cash-flow id ${flow.id} must be unique.`);
    ids.add(flow.id);
    if (flow.kind !== "income" && flow.kind !== "essential") throw new RangeError(`${flow.id}.kind must be income or essential.`);
    if (!["once", "weekly", "biweekly", "monthly"].includes(flow.cadence)) throw new RangeError(`${flow.id}.cadence is not supported.`);
    if (flow.certainty !== "confirmed" && flow.certainty !== "estimated") throw new RangeError(`${flow.id}.certainty must be confirmed or estimated.`);
    assertSafeInteger(flow.amountCents, `${flow.id}.amountCents`, 1);
    parseIsoDate(flow.nextDate, `${flow.id}.nextDate`);
    if (flow.endDate) {
      parseIsoDate(flow.endDate, `${flow.id}.endDate`);
      if (dayDifference(flow.nextDate, flow.endDate) < 0) throw new RangeError(`${flow.id}.endDate cannot be before nextDate.`);
    }
  }
  return ids;
}

function validateAdditionalOutflows(outflows: readonly AdditionalOutflowInput[], existingIds: ReadonlySet<string>): void {
  const ids = new Set(existingIds);
  for (const outflow of outflows) {
    if (outflow.id.trim().length === 0) throw new RangeError("additional outflow id cannot be empty.");
    if (ids.has(outflow.id)) throw new RangeError(`cash-flow id ${outflow.id} must be unique.`);
    ids.add(outflow.id);
    assertSafeInteger(outflow.amountCents, `${outflow.id}.amountCents`, 1);
    parseIsoDate(outflow.date, `${outflow.id}.date`);
  }
}

/**
 * Produces a plan-level, read-only projection. Existing goal allocations are
 * removed from the opening bank cash exactly once; scheduled contributions are
 * then simulated as future goal commitments. It never invents a starting cash
 * balance when the authorized snapshot is incomplete.
 */
export function projectPlan(input: PlanProjectionInput): PlanProjection {
  parseIsoDate(input.asOfDate, "asOfDate");
  parseIsoDate(input.horizonEndDate, "horizonEndDate");
  const horizonDays = dayDifference(input.asOfDate, input.horizonEndDate);
  if (horizonDays < 0) throw new RangeError("horizonEndDate cannot be before asOfDate.");
  if (horizonDays > 730) throw new RangeError("horizonEndDate cannot be more than two years after asOfDate.");
  assertSafeInteger(input.cashBufferCents, "cashBufferCents");
  if (input.startingEligibleCashCents !== null) assertSafeInteger(input.startingEligibleCashCents, "startingEligibleCashCents");
  const cashFlowIds = validateCashFlows(input.cashFlows);
  validateAdditionalOutflows(input.additionalOutflows ?? [], cashFlowIds);

  const goals = projectGoals(input);
  const assumptions = [
    "Opening eligible cash excludes restricted campus balances.",
    "Existing goal allocations are reserved once before future cash flows are simulated.",
    "Income is applied before outflows that share the same calendar date.",
  ];
  const warnings = [
    ...input.cashFlows.filter((flow) => flow.certainty === "estimated").map((flow) => `Cash flow ${flow.id} is estimated, not guaranteed.`),
    ...goals.filter((goal) => goal.projection.completionStatus === "no_contribution").map((goal) => `Goal ${goal.goalId} has no confirmed weekly contribution.`),
    ...goals.filter((goal) => goal.projection.completionStatus === "not_reached_in_horizon").map((goal) => `Goal ${goal.goalId} is not reached within the two-year horizon.`),
  ];

  if (input.startingEligibleCashCents === null) {
    return {
      feasibility: "needs_information",
      openingUnallocatedCashCents: null,
      minimumUnallocatedCashCents: null,
      goals,
      cashFlow: null,
      assumptions,
      warnings: ["Eligible bank cash is missing, so affordability and the cash buffer cannot be calculated.", ...warnings],
    };
  }

  const totalAllocatedCents = sumAllocatedCents(input.goals);
  const openingUnallocatedCashCents = safeAdd(input.startingEligibleCashCents, -totalAllocatedCents, "opening unallocated cash");
  if (openingUnallocatedCashCents < 0) {
    return {
      feasibility: "infeasible",
      openingUnallocatedCashCents,
      minimumUnallocatedCashCents: safeAdd(openingUnallocatedCashCents, -input.cashBufferCents, "opening cash after buffer"),
      goals,
      cashFlow: null,
      assumptions,
      warnings: [
        input.startingEligibleCashCents < 0
          ? "Eligible bank cash is below zero, so the plan cannot fund its cash buffer."
          : "Existing goal allocations exceed eligible bank cash; the plan double-reserves money.",
        ...warnings,
      ],
    };
  }

  const knownFlows: PlannedCashFlow[] = input.cashFlows.map((flow) => ({
    id: flow.id,
    kind: flow.kind === "essential" ? "essential_expense" : "income",
    amountCents: flow.amountCents,
    cadence: flow.cadence,
    nextDate: flow.nextDate,
    ...(flow.endDate ? { endDate: flow.endDate } : {}),
  }));
  const hypotheticalOutflows: PlannedCashFlow[] = (input.additionalOutflows ?? []).map((outflow) => ({
    id: outflow.id,
    kind: "hypothetical_purchase",
    amountCents: outflow.amountCents,
    cadence: "once",
    nextDate: outflow.date,
  }));
  const cashFlow = simulateCashFlow({
    asOfDate: input.asOfDate,
    horizonEndDate: input.horizonEndDate,
    startingEligibleCashCents: openingUnallocatedCashCents,
    cashBufferCents: input.cashBufferCents,
    flows: [...knownFlows, ...hypotheticalOutflows, ...goalContributionFlows(input.goals, goals)],
  });

  return {
    feasibility: cashFlow.status === "feasible" ? "feasible" : "infeasible",
    openingUnallocatedCashCents,
    minimumUnallocatedCashCents: cashFlow.minimumAvailableAfterBufferCents,
    goals,
    cashFlow,
    assumptions,
    warnings,
  };
}
