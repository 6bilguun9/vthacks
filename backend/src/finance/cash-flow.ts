import type { IsoDate } from "./goal-projection.js";

export type CashFlowKind = "income" | "essential_expense" | "goal_contribution" | "hypothetical_purchase";
export type CashFlowCadence = "once" | "weekly" | "biweekly" | "monthly";

export interface PlannedCashFlow {
  /** A stable user- or provider-owned identifier, used to explain a result. */
  readonly id: string;
  readonly kind: CashFlowKind;
  /** Positive integer cents. Expenses become negative when applied. */
  readonly amountCents: number;
  readonly cadence: CashFlowCadence;
  /** First scheduled occurrence; recurring schedules retain this day of month. */
  readonly nextDate: IsoDate;
  /** Inclusive final occurrence for a recurring schedule. */
  readonly endDate?: IsoDate;
}

export interface CashFlowSimulationInput {
  readonly asOfDate: IsoDate;
  /** Inclusive date through which known cash flows are projected. */
  readonly horizonEndDate: IsoDate;
  /** Bank cash that is eligible for this plan, excluding restricted balances. */
  readonly startingEligibleCashCents: number;
  readonly cashBufferCents: number;
  readonly flows: readonly PlannedCashFlow[];
}

export interface CashFlowEvent {
  readonly id: string;
  readonly kind: CashFlowKind;
  readonly date: IsoDate;
  readonly amountCents: number;
  readonly deltaCents: number;
  readonly balanceAfterCents: number;
  /** Eligible cash remaining after reserving the required buffer. */
  readonly availableAfterBufferCents: number;
}

export interface CashBufferBreach {
  readonly date: IsoDate;
  readonly eventId: string | null;
  readonly balanceCents: number;
  readonly availableAfterBufferCents: number;
}

export interface CashFlowSimulation {
  readonly status: "feasible" | "buffer_breached";
  readonly sameDayOrdering: "income_before_outflows";
  readonly openingEligibleCashCents: number;
  readonly cashBufferCents: number;
  readonly events: readonly CashFlowEvent[];
  readonly endingEligibleCashCents: number;
  readonly minimumEligibleCashCents: number;
  readonly minimumAvailableAfterBufferCents: number;
  readonly firstBufferBreach: CashBufferBreach | null;
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

function dayDifference(start: IsoDate, end: IsoDate): number {
  return Math.round((parseIsoDate(end, "end date").getTime() - parseIsoDate(start, "start date").getTime()) / millisecondsPerDay);
}

function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isSafeInteger(days)) throw new RangeError("days must be a safe integer.");
  return toIsoDate(new Date(parseIsoDate(date, "date").getTime() + days * millisecondsPerDay));
}

/** Adds calendar months while retaining the original day when the month allows it. */
function addMonthsAnchored(date: IsoDate, monthsToAdd: number): IsoDate {
  if (!Number.isSafeInteger(monthsToAdd) || monthsToAdd < 0) throw new RangeError("monthsToAdd must be a non-negative safe integer.");
  const source = parseIsoDate(date, "date");
  const targetMonthIndex = source.getUTCFullYear() * 12 + source.getUTCMonth() + monthsToAdd;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return toIsoDate(new Date(Date.UTC(targetYear, targetMonth, Math.min(source.getUTCDate(), lastDayOfMonth))));
}

function safeAdd(left: number, right: number, field: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new RangeError(`${field} exceeds the supported money range.`);
  return result;
}

function firstOccurrenceOnOrAfter(flow: PlannedCashFlow, asOfDate: IsoDate): { date: IsoDate; occurrence: number } | null {
  if (flow.cadence === "once") return compareDates(flow.nextDate, asOfDate) >= 0 ? { date: flow.nextDate, occurrence: 0 } : null;
  if (compareDates(flow.nextDate, asOfDate) >= 0) return { date: flow.nextDate, occurrence: 0 };

  if (flow.cadence === "weekly" || flow.cadence === "biweekly") {
    const intervalDays = flow.cadence === "weekly" ? 7 : 14;
    const elapsedDays = dayDifference(flow.nextDate, asOfDate);
    const occurrence = Math.ceil(elapsedDays / intervalDays);
    return { date: addDays(flow.nextDate, occurrence * intervalDays), occurrence };
  }

  const start = parseIsoDate(flow.nextDate, "nextDate");
  const asOf = parseIsoDate(asOfDate, "asOfDate");
  let occurrence = Math.max(0, (asOf.getUTCFullYear() - start.getUTCFullYear()) * 12 + asOf.getUTCMonth() - start.getUTCMonth());
  let date = addMonthsAnchored(flow.nextDate, occurrence);
  if (compareDates(date, asOfDate) < 0) {
    occurrence += 1;
    date = addMonthsAnchored(flow.nextDate, occurrence);
  }
  return { date, occurrence };
}

function nextOccurrence(flow: PlannedCashFlow, occurrence: number): { date: IsoDate; occurrence: number } {
  const next = occurrence + 1;
  if (flow.cadence === "weekly") return { date: addDays(flow.nextDate, next * 7), occurrence: next };
  if (flow.cadence === "biweekly") return { date: addDays(flow.nextDate, next * 14), occurrence: next };
  if (flow.cadence === "monthly") return { date: addMonthsAnchored(flow.nextDate, next), occurrence: next };
  throw new RangeError("A one-time cash flow does not have a next occurrence.");
}

function expandEvents(input: CashFlowSimulationInput): Array<Pick<CashFlowEvent, "id" | "kind" | "date" | "amountCents" | "deltaCents">> {
  const events: Array<Pick<CashFlowEvent, "id" | "kind" | "date" | "amountCents" | "deltaCents">> = [];
  const ids = new Set<string>();

  for (const flow of input.flows) {
    if (flow.id.trim().length === 0) throw new RangeError("cash-flow id cannot be empty.");
    if (ids.has(flow.id)) throw new RangeError(`cash-flow id ${flow.id} must be unique.`);
    ids.add(flow.id);
    assertSafeInteger(flow.amountCents, `${flow.id}.amountCents`, 1);
    parseIsoDate(flow.nextDate, `${flow.id}.nextDate`);
    if (flow.endDate) {
      parseIsoDate(flow.endDate, `${flow.id}.endDate`);
      if (compareDates(flow.endDate, flow.nextDate) < 0) throw new RangeError(`${flow.id}.endDate cannot be before nextDate.`);
    }

    let next = firstOccurrenceOnOrAfter(flow, input.asOfDate);
    while (next && compareDates(next.date, input.horizonEndDate) <= 0 && (!flow.endDate || compareDates(next.date, flow.endDate) <= 0)) {
      events.push({
        id: flow.id,
        kind: flow.kind,
        date: next.date,
        amountCents: flow.amountCents,
        deltaCents: flow.kind === "income" ? flow.amountCents : -flow.amountCents,
      });
      next = flow.cadence === "once" ? null : nextOccurrence(flow, next.occurrence);
    }
  }

  return events.sort((left, right) => {
    const dateDifference = compareDates(left.date, right.date);
    if (dateDifference !== 0) return dateDifference;
    const kindOrder = (kind: CashFlowKind) => kind === "income" ? 0 : kind === "essential_expense" ? 1 : kind === "goal_contribution" ? 2 : 3;
    const kindDifference = kindOrder(left.kind) - kindOrder(right.kind);
    return kindDifference !== 0 ? kindDifference : left.id.localeCompare(right.id);
  });
}

/**
 * Simulates only known, dated cash flows. It deliberately treats restricted
 * campus balances as out of scope: callers must pass only plan-eligible bank
 * cash. On a shared date income is applied before all outflows, and the
 * result exposes that assumption for the UI and AI explanation layer.
 */
export function simulateCashFlow(input: CashFlowSimulationInput): CashFlowSimulation {
  parseIsoDate(input.asOfDate, "asOfDate");
  parseIsoDate(input.horizonEndDate, "horizonEndDate");
  if (compareDates(input.horizonEndDate, input.asOfDate) < 0) throw new RangeError("horizonEndDate cannot be before asOfDate.");
  assertSafeInteger(input.startingEligibleCashCents, "startingEligibleCashCents");
  assertSafeInteger(input.cashBufferCents, "cashBufferCents");

  const openingAvailableAfterBufferCents = safeAdd(input.startingEligibleCashCents, -input.cashBufferCents, "opening available cash");
  let balanceCents = input.startingEligibleCashCents;
  let minimumEligibleCashCents = balanceCents;
  let minimumAvailableAfterBufferCents = openingAvailableAfterBufferCents;
  let firstBufferBreach: CashBufferBreach | null = openingAvailableAfterBufferCents < 0
    ? {
        date: input.asOfDate,
        eventId: null,
        balanceCents,
        availableAfterBufferCents: openingAvailableAfterBufferCents,
      }
    : null;

  const events = expandEvents(input).map((event) => {
    balanceCents = safeAdd(balanceCents, event.deltaCents, `balance after ${event.id}`);
    const availableAfterBufferCents = safeAdd(balanceCents, -input.cashBufferCents, `available cash after ${event.id}`);
    minimumEligibleCashCents = Math.min(minimumEligibleCashCents, balanceCents);
    minimumAvailableAfterBufferCents = Math.min(minimumAvailableAfterBufferCents, availableAfterBufferCents);
    if (!firstBufferBreach && availableAfterBufferCents < 0) {
      firstBufferBreach = {
        date: event.date,
        eventId: event.id,
        balanceCents,
        availableAfterBufferCents,
      };
    }
    return { ...event, balanceAfterCents: balanceCents, availableAfterBufferCents };
  });

  return {
    status: firstBufferBreach ? "buffer_breached" : "feasible",
    sameDayOrdering: "income_before_outflows",
    openingEligibleCashCents: input.startingEligibleCashCents,
    cashBufferCents: input.cashBufferCents,
    events,
    endingEligibleCashCents: balanceCents,
    minimumEligibleCashCents,
    minimumAvailableAfterBufferCents,
    firstBufferBreach,
  };
}
