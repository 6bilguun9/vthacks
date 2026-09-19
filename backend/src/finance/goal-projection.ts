export type IsoDate = `${number}-${number}-${number}`;

export interface GoalProjectionInput {
  readonly asOfDate: IsoDate;
  readonly targetCents: number;
  readonly allocatedCents: number;
  readonly weeklyContributionCents: number;
  readonly contributionStartDate: IsoDate;
  readonly targetDate: IsoDate | null;
  /** Defaults to two calendar years after asOfDate. */
  readonly horizonEndDate?: IsoDate;
}

export interface GoalProjection {
  readonly remainingCents: number;
  readonly nextContributionDate: IsoDate | null;
  readonly contributionCount: number | null;
  readonly completionDate: IsoDate | null;
  readonly requiredWeeklyCents: number | null;
  readonly deadlineStatus: "no_deadline" | "feasible" | "infeasible" | "past_due" | "no_contribution_before_deadline";
  readonly completionStatus: "reached" | "projected" | "no_contribution" | "not_reached_in_horizon";
  readonly horizonEndDate: IsoDate;
}

export interface PurchaseScenarioInput {
  readonly goal: GoalProjectionInput;
  readonly purchaseCents: number;
  readonly discretionaryFundingCents: number;
  readonly discretionaryAvailableCents: number;
  readonly unallocatedFundingCents: number;
  /** Leave undefined when the user has not chosen a goal to affect. */
  readonly goalFundingCents?: number;
}

export interface GoalPurchaseImpact {
  readonly before: GoalProjection;
  readonly after: GoalProjection;
  readonly delayDays: number | null;
  readonly nextWeekExtraCents: number | null;
  readonly remainingWeeklyExtraCents: number | null;
}

export interface PurchaseScenario {
  readonly status: "within_discretionary" | "uses_unallocated_cash" | "requires_goal_change" | "needs_information";
  readonly funding: {
    readonly discretionaryCents: number;
    readonly unallocatedCents: number;
    readonly goalCents: number;
  };
  readonly goalImpact: GoalPurchaseImpact | null;
}

const millisecondsPerDay = 86_400_000;

function assertSafeInteger(value: number, field: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new RangeError(`${field} must be a safe integer of at least ${minimum}.`);
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

function compareDates(left: IsoDate, right: IsoDate): number {
  return parseIsoDate(left, "date").getTime() - parseIsoDate(right, "date").getTime();
}

function addDays(date: IsoDate, days: number): IsoDate {
  assertSafeInteger(days, "days");
  return toIsoDate(new Date(parseIsoDate(date, "date").getTime() + days * millisecondsPerDay));
}

function dayDifference(start: IsoDate, end: IsoDate): number {
  return Math.round((parseIsoDate(end, "end date").getTime() - parseIsoDate(start, "start date").getTime()) / millisecondsPerDay);
}

function nextWeeklyDate(asOfDate: IsoDate, contributionStartDate: IsoDate): IsoDate {
  if (compareDates(contributionStartDate, asOfDate) >= 0) return contributionStartDate;
  const elapsedDays = dayDifference(contributionStartDate, asOfDate);
  const daysUntilContribution = (7 - (elapsedDays % 7)) % 7;
  return addDays(asOfDate, daysUntilContribution);
}

function contributionOpportunities(firstContributionDate: IsoDate, finalDate: IsoDate): number {
  if (compareDates(firstContributionDate, finalDate) > 0) return 0;
  return Math.floor(dayDifference(firstContributionDate, finalDate) / 7) + 1;
}

function ceilDivide(dividend: number, divisor: number): number {
  if (divisor <= 0) throw new RangeError("divisor must be positive.");
  return Math.ceil(dividend / divisor);
}

/**
 * Deterministically projects a single goal. It models only confirmed weekly
 * contributions; income, bills, cash buffers, and other goals belong in the
 * plan-level cash-flow simulation that will call this function.
 */
export function projectGoal(input: GoalProjectionInput): GoalProjection {
  assertSafeInteger(input.targetCents, "targetCents", 1);
  assertSafeInteger(input.allocatedCents, "allocatedCents");
  assertSafeInteger(input.weeklyContributionCents, "weeklyContributionCents");
  if (input.allocatedCents > input.targetCents) throw new RangeError("allocatedCents cannot exceed targetCents.");

  parseIsoDate(input.asOfDate, "asOfDate");
  parseIsoDate(input.contributionStartDate, "contributionStartDate");
  if (input.targetDate) parseIsoDate(input.targetDate, "targetDate");
  const horizonEndDate = input.horizonEndDate ?? addDays(input.asOfDate, 730);
  parseIsoDate(horizonEndDate, "horizonEndDate");
  if (compareDates(horizonEndDate, input.asOfDate) < 0) throw new RangeError("horizonEndDate cannot be before asOfDate.");

  const remainingCents = input.targetCents - input.allocatedCents;
  if (remainingCents === 0) {
    return {
      remainingCents,
      nextContributionDate: null,
      contributionCount: 0,
      completionDate: input.asOfDate,
      requiredWeeklyCents: 0,
      deadlineStatus: input.targetDate && compareDates(input.asOfDate, input.targetDate) > 0 ? "past_due" : input.targetDate ? "feasible" : "no_deadline",
      completionStatus: "reached",
      horizonEndDate,
    };
  }

  const nextContributionDate = nextWeeklyDate(input.asOfDate, input.contributionStartDate);
  const deadlineOpportunities = input.targetDate ? contributionOpportunities(nextContributionDate, input.targetDate) : null;
  const requiredWeeklyCents = deadlineOpportunities && deadlineOpportunities > 0 ? ceilDivide(remainingCents, deadlineOpportunities) : null;
  const deadlineStatus: GoalProjection["deadlineStatus"] = input.targetDate === null
    ? "no_deadline"
    : compareDates(input.targetDate, input.asOfDate) < 0
      ? "past_due"
      : deadlineOpportunities === 0
        ? "no_contribution_before_deadline"
        : input.weeklyContributionCents >= (requiredWeeklyCents ?? Number.MAX_SAFE_INTEGER)
          ? "feasible"
          : "infeasible";

  if (input.weeklyContributionCents === 0) {
    return {
      remainingCents,
      nextContributionDate,
      contributionCount: null,
      completionDate: null,
      requiredWeeklyCents,
      deadlineStatus,
      completionStatus: "no_contribution",
      horizonEndDate,
    };
  }

  const contributionCount = ceilDivide(remainingCents, input.weeklyContributionCents);
  const horizonOpportunities = contributionOpportunities(nextContributionDate, horizonEndDate);
  if (contributionCount > horizonOpportunities) {
    return {
      remainingCents,
      nextContributionDate,
      contributionCount: null,
      completionDate: null,
      requiredWeeklyCents,
      deadlineStatus,
      completionStatus: "not_reached_in_horizon",
      horizonEndDate,
    };
  }
  const candidateCompletionDate = addDays(nextContributionDate, (contributionCount - 1) * 7);
  return {
    remainingCents,
    nextContributionDate,
    contributionCount,
    completionDate: candidateCompletionDate,
    requiredWeeklyCents,
    deadlineStatus,
    completionStatus: "projected",
    horizonEndDate,
  };
}

/**
 * Compares a purchase against explicit funding choices. The engine never
 * assumes that an uncovered purchase should reduce a savings goal.
 */
export function comparePurchaseToGoal(input: PurchaseScenarioInput): PurchaseScenario {
  assertSafeInteger(input.purchaseCents, "purchaseCents", 1);
  assertSafeInteger(input.discretionaryFundingCents, "discretionaryFundingCents");
  assertSafeInteger(input.discretionaryAvailableCents, "discretionaryAvailableCents");
  assertSafeInteger(input.unallocatedFundingCents, "unallocatedFundingCents");
  if (input.discretionaryFundingCents > input.discretionaryAvailableCents) {
    throw new RangeError("discretionaryFundingCents cannot exceed discretionaryAvailableCents.");
  }
  if (input.goalFundingCents !== undefined) assertSafeInteger(input.goalFundingCents, "goalFundingCents");

  const knownFundingCents = input.discretionaryFundingCents + input.unallocatedFundingCents + (input.goalFundingCents ?? 0);
  assertSafeInteger(knownFundingCents, "total funding");
  if (knownFundingCents !== input.purchaseCents) {
    return {
      status: "needs_information",
      funding: { discretionaryCents: input.discretionaryFundingCents, unallocatedCents: input.unallocatedFundingCents, goalCents: input.goalFundingCents ?? 0 },
      goalImpact: null,
    };
  }

  const goalFundingCents = input.goalFundingCents ?? 0;
  if (goalFundingCents === 0) {
    return {
      status: input.unallocatedFundingCents > 0 ? "uses_unallocated_cash" : "within_discretionary",
      funding: { discretionaryCents: input.discretionaryFundingCents, unallocatedCents: input.unallocatedFundingCents, goalCents: 0 },
      goalImpact: null,
    };
  }
  if (goalFundingCents > input.goal.allocatedCents) throw new RangeError("goalFundingCents cannot exceed allocatedCents.");

  const before = projectGoal(input.goal);
  const after = projectGoal({ ...input.goal, allocatedCents: input.goal.allocatedCents - goalFundingCents });
  const delayDays = before.completionDate && after.completionDate ? dayDifference(before.completionDate, after.completionDate) : null;
  const remainingWeeklyExtraCents = before.contributionCount && before.contributionCount > 0
    ? ceilDivide(goalFundingCents, before.contributionCount)
    : null;

  return {
    status: "requires_goal_change",
    funding: { discretionaryCents: input.discretionaryFundingCents, unallocatedCents: input.unallocatedFundingCents, goalCents: goalFundingCents },
    goalImpact: {
      before,
      after,
      delayDays,
      nextWeekExtraCents: goalFundingCents,
      remainingWeeklyExtraCents,
    },
  };
}
