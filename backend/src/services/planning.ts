import { createHash } from "node:crypto";
import { projectGoal, type IsoDate } from "../finance/goal-projection.js";
import { projectPlan, type AdditionalOutflowInput, type PlanCashFlowInput, type PlanGoalInput } from "../finance/plan-projection.js";
import { AppError, planSchema, scenarioSchema, type GoalImpact, type Plan, type Projection, type ScenarioComparison, type ScenarioRequest, type Snapshot } from "../domain/model.js";
import { deriveEligibleBankCash } from "./eligible-bank-cash.js";
import { assessSourceFreshness } from "./source-freshness.js";

const DAY = 86_400_000;
const HORIZON_DAYS = 730;

type Core = { projection: Projection; minimum: number | null; capacityFrom: (date: IsoDate) => number | null; feasibility: Projection["feasibility"]; warnings: string[] };

function fail(message: string): never { throw new AppError(422, "INVALID_PLAN", message); }
function generatedId(...parts: (string | number)[]): string { return `generated-${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`; }
function dateOf(value: Date): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}` as IsoDate;
}
function parseDate(value: string, field: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${field} must be an ISO calendar date.`);
  const [year, month, day] = value.split("-").map(Number);
  const result = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  if (result.getUTCFullYear() !== year || result.getUTCMonth() !== (month ?? 1) - 1 || result.getUTCDate() !== day) fail(`${field} must be a real calendar date.`);
  return result;
}
function addDays(date: IsoDate, days: number): IsoDate { return new Date(parseDate(date, "date").getTime() + days * DAY).toISOString().slice(0, 10) as IsoDate; }
function compare(left: IsoDate, right: IsoDate): number { return parseDate(left, "date").getTime() - parseDate(right, "date").getTime(); }
function safeAdd(left: number, right: number, field: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) fail(`${field} exceeds the supported money range.`);
  return result;
}
function asDate(now: Date): IsoDate {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) fail("now must be a valid date.");
  return dateOf(now);
}
function nextMonday(date: IsoDate): IsoDate {
  const day = parseDate(date, "date").getUTCDay();
  return addDays(date, (8 - day) % 7);
}
function validateSnapshot(snapshot: Snapshot): void {
  if (!snapshot || typeof snapshot !== "object" || typeof snapshot.id !== "string" || !Array.isArray(snapshot.accounts) || !Array.isArray(snapshot.universityCharges)) fail("snapshot is invalid.");
}
function parsePlan(plan: Plan): Plan {
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) fail("plan contains invalid amounts, dates, or identifiers.");
  const unique = (values: readonly { id: string }[], field: string) => {
    const ids = new Set<string>();
    for (const value of values) { if (ids.has(value.id)) fail(`${field} IDs must be unique.`); ids.add(value.id); }
  };
  unique(parsed.data.goals, "goal"); unique(parsed.data.cashFlows, "cash-flow"); unique(parsed.data.plannedPurchases, "planned purchase"); unique(parsed.data.extraContributions, "extra contribution");
  const goalIds = new Set(parsed.data.goals.map(goal => goal.id));
  for (const purchase of parsed.data.plannedPurchases) {
    if (!["planned", "needs_reconciliation"].includes(purchase.status)) continue;
    if (safeAdd(safeAdd(purchase.funding.discretionaryCents, purchase.funding.unallocatedCents, "purchase funding"), purchase.funding.goalCents, "purchase funding") !== purchase.amountCents) fail("Outstanding purchases must have complete funding details.");
    if (purchase.funding.goalCents > 0 && (!purchase.fundingGoalId || !goalIds.has(purchase.fundingGoalId))) fail("Outstanding goal-funded purchases must reference an existing goal.");
  }
  if (parsed.data.extraContributions.some(extra => !goalIds.has(extra.goalId))) fail("Extra contributions must reference an existing goal.");
  if (parsed.data.selectedBankAccountIds && new Set(parsed.data.selectedBankAccountIds).size !== parsed.data.selectedBankAccountIds.length) fail("selected account IDs must be unique.");
  return parsed.data;
}
function parseScenario(request: ScenarioRequest): ScenarioRequest {
  const parsed = scenarioSchema.safeParse(request);
  if (!parsed.success) fail("scenario contains invalid amounts, dates, or funding choices.");
  return parsed.data;
}

function weekStart(date: IsoDate): IsoDate { return addDays(date, -((parseDate(date, "date").getUTCDay() + 6) % 7)); }
function discretionaryAvailable(plan: Plan, asOf: IsoDate, date: IsoDate): number {
  const bucket = compare(date, nextMonday(addDays(asOf, 1))) < 0 ? plan.discretionaryRemainingCents : plan.weeklyDiscretionaryCents;
  const start = weekStart(date);
  const committed = plan.plannedPurchases.filter((purchase) => purchase.status === "planned" && weekStart(purchase.date as IsoDate) === start).reduce((sum, purchase) => safeAdd(sum, purchase.funding.discretionaryCents, "discretionary purchases"), 0);
  return Math.max(0, bucket - committed);
}
/** Current-period remainder is reserved today; later allowances are reserved each Monday. */
function discretionaryFlows(plan: Plan, asOf: IsoDate, horizon: IsoDate): PlanCashFlowInput[] {
  const flows: PlanCashFlowInput[] = [];
  // The whole allowance remains a dated budget outflow. A purchase funded by
  // it consumes that reservation for allocation purposes but never removes
  // the forecasted spending from cash (which would recreate money).
  const current = plan.discretionaryRemainingCents;
  if (current > 0) flows.push({ id: "__discretionary_current__", kind: "essential", amountCents: current, cadence: "once", nextDate: asOf, certainty: "confirmed" });
  const first = nextMonday(addDays(asOf, 1));
  if (plan.weeklyDiscretionaryCents > 0 && compare(first, horizon) <= 0) flows.push({ id: "__discretionary_weekly__", kind: "essential", amountCents: plan.weeklyDiscretionaryCents, cadence: "weekly", nextDate: first, certainty: "confirmed" });
  return flows;
}
function purchaseStatusWarnings(snapshot: Snapshot, plan: Plan, asOf: IsoDate): string[] {
  const bankDate = snapshot.source.fetchedAt ? dateOf(new Date(snapshot.source.fetchedAt)) : null;
  return plan.plannedPurchases.flatMap((purchase) => {
    if (purchase.status === "needs_reconciliation" || (purchase.status === "planned" && compare(purchase.date as IsoDate, asOf) < 0)) return [`Planned purchase ${purchase.id} needs reconciliation before its cash impact can be trusted.`];
    if (purchase.status !== "planned") return [];
    const created = purchase.createdAt ? Date.parse(purchase.createdAt) : NaN;
    const reflectedByFreshBank = snapshot.source.kind === "nessie_sandbox" && bankDate !== null && compare(purchase.date as IsoDate, bankDate) <= 0 && Number.isFinite(created) && Date.parse(snapshot.source.fetchedAt!) > created;
    const legacyMatch = !purchase.createdAt && snapshot.transactions.some((transaction) => transaction.date === purchase.date && transaction.amountCents === purchase.amountCents && ["completed", "executed"].includes(transaction.status.toLowerCase()));
    if (reflectedByFreshBank || legacyMatch) return [`Planned purchase ${purchase.id} needs reconciliation before its cash impact can be trusted.`];
    return [];
  });
}
function purchaseOutflows(snapshot: Snapshot, plan: Plan, asOf: IsoDate, horizon: IsoDate): { outflows: AdditionalOutflowInput[]; warnings: string[] } {
  const outflows: AdditionalOutflowInput[] = [];
  const warnings = purchaseStatusWarnings(snapshot, plan, asOf);
  for (const purchase of plan.plannedPurchases) {
    if (purchase.status !== "planned" || compare(purchase.date as IsoDate, asOf) < 0 || compare(purchase.date as IsoDate, horizon) > 0) continue;
    const funded = safeAdd(safeAdd(purchase.funding.discretionaryCents, purchase.funding.unallocatedCents, "purchase funding"), purchase.funding.goalCents, "purchase funding");
    if (funded !== purchase.amountCents) warnings.push(`Planned purchase ${purchase.id} needs complete funding details.`);
    // Discretionary money is already represented by its reservation. Goal funds
    // remain reserved until the purchase date, so neither gets a second debit.
    if (purchase.funding.unallocatedCents > 0) outflows.push({ id: `__purchase__${purchase.id}`, amountCents: purchase.funding.unallocatedCents, date: purchase.date as IsoDate });
  }
  return { outflows, warnings };
}
type Ledger = { outflows: AdditionalOutflowInput[]; goals: Projection["goals"]; tuitionReleases: Map<string, number>; warnings: string[]; infeasible: boolean };
function goalLedger(snapshot: Snapshot, plan: Plan, asOf: IsoDate, horizon: IsoDate): Ledger {
  type Event = { date: IsoDate; kind: "withdraw" | "contribute"; amount: number; id: string; terminal: boolean };
  const releases = new Map<string, number>(); const warnings: string[] = []; const output: Projection["goals"] = []; const outflows: AdditionalOutflowInput[] = []; let infeasible = false;
  const tuition = new Map<string, Snapshot["universityCharges"][number]>();
  for (const charge of snapshot.universityCharges) if (charge.fundingGoalId && charge.dueDate) { if (tuition.has(charge.fundingGoalId)) { warnings.push(`Multiple university charges use tuition goal ${charge.fundingGoalId}.`); infeasible = true; } else tuition.set(charge.fundingGoalId, charge); }
  for (const goal of plan.goals) {
    const events: Event[] = [];
    let baseDate = goal.contributionStartDate as IsoDate;
    if (compare(baseDate, asOf) < 0) baseDate = addDays(baseDate, Math.ceil((parseDate(asOf, "asOf").getTime() - parseDate(baseDate, "start").getTime()) / DAY / 7) * 7);
    for (let date = baseDate, index = 0; compare(date, horizon) <= 0; date = addDays(date, 7), index += 1) if (goal.weeklyContributionCents > 0) events.push({ date, kind: "contribute", amount: goal.weeklyContributionCents, id: `__goal__${goal.id}__${index}`, terminal: false });
    for (const extra of plan.extraContributions.filter((item) => item.goalId === goal.id)) {
      if (extra.cadence === "once") { if (compare(extra.date as IsoDate, asOf) >= 0 && compare(extra.date as IsoDate, horizon) <= 0) events.push({ date: extra.date as IsoDate, kind: "contribute", amount: extra.amountCents, id: `__extra__${extra.id}`, terminal: false }); }
      else { let start = extra.date as IsoDate; if (compare(start, asOf) < 0) start = addDays(start, Math.ceil((parseDate(asOf, "asOf").getTime() - parseDate(start, "start").getTime()) / DAY / 7) * 7); for (let date = start, index = 0; compare(date, horizon) <= 0 && (!extra.endDate || compare(date, extra.endDate as IsoDate) <= 0); date = addDays(date, 7), index += 1) events.push({ date, kind: "contribute", amount: extra.amountCents, id: `__extra__${extra.id}__${index}`, terminal: false }); }
    }
    for (const purchase of plan.plannedPurchases.filter((item) => item.status === "planned" && item.fundingGoalId === goal.id && compare(item.date as IsoDate, asOf) >= 0 && compare(item.date as IsoDate, horizon) <= 0)) events.push({ date: purchase.date as IsoDate, kind: "withdraw", amount: purchase.funding.goalCents, id: purchase.id, terminal: false });
    const charge = tuition.get(goal.id);
    if (charge) {
      if (goal.targetCents !== charge.amountCents) warnings.push(`Tuition goal ${goal.id} must have the same target as charge ${charge.id}.`);
      else if (compare(charge.dueDate!, asOf) >= 0 && compare(charge.dueDate!, horizon) <= 0) events.push({ date: charge.dueDate!, kind: "withdraw", amount: charge.amountCents, id: `tuition-${charge.id}`, terminal: true });
    }
    const rank = (event: Event) => event.kind === "contribute" ? 1 : event.terminal ? 2 : 0;
    events.sort((a, b) => compare(a.date, b.date) || rank(a) - rank(b) || a.id.localeCompare(b.id));
    let balance = goal.allocatedCents; let completed: IsoDate | null = balance >= goal.targetCents ? asOf : null; let terminal = false;
    for (const event of events) {
      if (event.kind === "withdraw") {
        const withdrawn = Math.min(balance, event.amount); balance -= withdrawn;
        if (event.id.startsWith("tuition-")) { releases.set(event.id.slice(8), withdrawn); if (withdrawn < event.amount) { warnings.push(`Tuition charge ${event.id.slice(8)} is not fully funded by its reservation.`); infeasible = true; } else completed = event.date; }
        if (event.amount > withdrawn && !event.id.startsWith("tuition-")) { warnings.push(`Goal-funded purchase ${event.id} exceeds funds reserved on its purchase date.`); infeasible = true; }
        if (!event.terminal) completed = null; terminal ||= event.terminal;
      } else if (!terminal && balance < goal.targetCents) {
        const amount = Math.min(event.amount, goal.targetCents - balance);
        if (amount > 0) { outflows.push({ id: event.id, amountCents: amount, date: event.date }); balance += amount; if (balance === goal.targetCents) completed = event.date; }
      }
    }
    const base = projectGoal({ asOfDate: asOf, horizonEndDate: horizon, targetCents: goal.targetCents, allocatedCents: goal.allocatedCents, weeklyContributionCents: goal.weeklyContributionCents, contributionStartDate: goal.contributionStartDate as IsoDate, targetDate: goal.targetDate as IsoDate | null });
    if (goal.targetDate && goal.allocatedCents < goal.targetCents && (!completed || completed > goal.targetDate)) {
      warnings.push(`Goal ${goal.id} cannot meet its preferred deadline with the current contributions.`);
      infeasible = true;
    }
    if (!completed) warnings.push(`Goal ${goal.id} is not reached within the two-year forecast; confirm or increase its contribution.`);
    output.push({ goalId: goal.id, completionDate: completed, requiredWeeklyCents: base.requiredWeeklyCents });
  }
  return { outflows, goals: output, tuitionReleases: releases, warnings, infeasible };
}
function universityFlows(snapshot: Snapshot, plan: Plan, asOf: IsoDate, horizon: IsoDate, releases: ReadonlyMap<string, number>): { flows: PlanCashFlowInput[]; warnings: string[] } {
  const flows: PlanCashFlowInput[] = [];
  const warnings: string[] = [];
  const goals = new Map(plan.goals.map((goal) => [goal.id, goal]));
  for (const charge of snapshot.universityCharges) {
    if (charge.dueDate === null) { warnings.push(`University charge ${charge.id} needs a due date.`); continue; }
    if (compare(charge.dueDate, asOf) < 0) { warnings.push(`University charge ${charge.id} is overdue and needs reconciliation.`); continue; }
    if (compare(charge.dueDate, horizon) > 0) continue;
    if (charge.fundingGoalId !== null) {
      const goal = goals.get(charge.fundingGoalId);
      if (!goal) { warnings.push(`University charge ${charge.id} names a missing tuition goal.`); continue; }
      const covered = releases.get(charge.id) ?? 0;
      if (covered > 0) flows.push({ id: `__tuition_release__${charge.id}`, kind: "income", amountCents: covered, cadence: "once", nextDate: charge.dueDate, certainty: "confirmed" });
      if (covered < charge.amountCents) warnings.push(`University charge ${charge.id} exceeds its linked goal reservation by ${charge.amountCents - covered} cents.`);
    }
    flows.push({ id: `__university_charge__${charge.id}`, kind: "essential", amountCents: charge.amountCents, cadence: "once", nextDate: charge.dueDate, certainty: "confirmed" });
  }
  return { flows, warnings };
}
function freshnessWarnings(snapshot: Snapshot, now: Date): string[] {
  const stamp = now.toISOString();
  const warnings: string[] = [];
  if (assessSourceFreshness(snapshot.source, stamp, 24 * 60 * 60 * 1000).status !== "fresh") warnings.push("Bank data is stale or has an invalid timestamp; refresh it before relying on affordability.");
  for (const item of [...snapshot.campusBalances, ...snapshot.universityCharges]) {
    if (assessSourceFreshness(item.source, stamp, 7 * 24 * 60 * 60 * 1000).status !== "fresh") warnings.push(`Manual source for ${item.id} is stale or has an invalid timestamp.`);
  }
  return warnings;
}
function core(snapshot: Snapshot, plan: Plan, now: Date): Core {
  validateSnapshot(snapshot); const parsed = parsePlan(plan); const asOf = asDate(now); const horizon = addDays(asOf, HORIZON_DAYS);
  if (snapshot.id !== parsed.snapshotId) fail("plan snapshotId does not match the supplied snapshot.");
  const eligible = deriveEligibleBankCash(snapshot, parsed.selectedBankAccountIds);
  const ledger = goalLedger(snapshot, parsed, asOf, horizon);
  const charge = universityFlows(snapshot, parsed, asOf, horizon, ledger.tuitionReleases);
  const purchases = purchaseOutflows(snapshot, parsed, asOf, horizon);
  const warnings = [...eligible.warnings, ...ledger.warnings, ...charge.warnings, ...purchases.warnings, ...freshnessWarnings(snapshot, now)];
  const currentWeek = weekStart(asOf);
  const committedByWeek = new Map<string, number>();
  for (const purchase of parsed.plannedPurchases) if (purchase.status === "planned" && purchase.date >= asOf) {
    const week = weekStart(purchase.date as IsoDate);
    committedByWeek.set(week, safeAdd(committedByWeek.get(week) ?? 0, purchase.funding.discretionaryCents, "discretionary commitments"));
  }
  const discretionaryOvercommitted = [...committedByWeek].some(([week, amount]) => amount > (week === currentWeek ? parsed.discretionaryRemainingCents : parsed.weeklyDiscretionaryCents));
  if (discretionaryOvercommitted) warnings.push("Saved purchases exceed their weekly discretionary allowance; cancel or revise those commitments before spending.");
  const confirmation = parsed.discretionaryConfirmedAt ? dateOf(new Date(parsed.discretionaryConfirmedAt)) : null;
  if (parsed.discretionaryRemainingCents > 0 && (parsed.discretionaryPeriodStart !== currentWeek || confirmation === null || compare(confirmation, currentWeek) < 0 || compare(confirmation, addDays(currentWeek, 6)) > 0)) warnings.push("Current discretionary remainder needs a confirmation from this week.");
  if (!parsed.incomeComplete) warnings.push("Income information is incomplete.");
  if (!parsed.expensesComplete) warnings.push("Essential expense information is incomplete.");
  const result = projectPlan({
    asOfDate: asOf, horizonEndDate: horizon,
    startingEligibleCashCents: eligible.status === "ready" ? eligible.eligibleCashCents : null,
    cashBufferCents: parsed.cashBufferCents,
    goals: parsed.goals.map((goal) => ({ ...goal, weeklyContributionCents: 0 })) as readonly PlanGoalInput[],
    cashFlows: [...(parsed.cashFlows as readonly PlanCashFlowInput[]), ...discretionaryFlows(parsed, asOf, horizon), ...charge.flows],
    additionalOutflows: [...purchases.outflows, ...ledger.outflows],
  });
  const needsInfo = !parsed.incomeComplete || !parsed.expensesComplete || warnings.some((warning) => /stale|needs a due date|overdue|needs reconciliation|complete funding|missing tuition|needs a confirmation|must have the same target/i.test(warning));
  const feasibility: Projection["feasibility"] = needsInfo ? "needs_information" : (ledger.infeasible || discretionaryOvercommitted || result.feasibility === "infeasible") ? "infeasible" : result.feasibility;
  const capacityFrom = (date: IsoDate): number | null => {
    if (!result.cashFlow || result.openingUnallocatedCashCents === null) return null;
    let capacity = result.openingUnallocatedCashCents - parsed.cashBufferCents;
    for (const event of result.cashFlow.events) {
      if (compare(event.date, date) <= 0) capacity = event.availableAfterBufferCents;
      else capacity = Math.min(capacity, event.availableAfterBufferCents);
    }
    return capacity;
  };
  return {
    feasibility, minimum: result.minimumUnallocatedCashCents, capacityFrom, warnings,
    projection: { asOf, horizonEnd: horizon, feasibility, minimumUnallocatedCashCents: result.minimumUnallocatedCashCents, goals: ledger.goals, assumptions: [...result.assumptions, "Current discretionary remainder is reserved today; future weekly discretionary budgets are reserved on Mondays.", "University charges and linked tuition reservations are counted once."], warnings: [...result.warnings.filter((warning) => !/no confirmed weekly contribution|not reached within the two-year horizon/.test(warning)), ...warnings] },
  };
}

/** Pure plan calculation with injected time; no persistence or mutation. */
export function calculatePlan(snapshot: Snapshot, plan: Plan, now: Date): Projection { return core(snapshot, plan, now).projection; }

function recoveryImpact(goal: Plan["goals"][number], goalFunding: number, now: Date, baseline: Plan, proposed: Plan, snapshot: Snapshot): GoalImpact {
  const asOf = asDate(now); const horizon = addDays(asOf, HORIZON_DAYS);
  const beforeProjection = core(snapshot, baseline, now).projection;
  const afterProjection = core(snapshot, proposed, now).projection;
  const beforeDate = beforeProjection.goals.find((item) => item.goalId === goal.id)?.completionDate ?? null;
  const afterDate = afterProjection.goals.find((item) => item.goalId === goal.id)?.completionDate ?? null;
  const staticBefore = projectGoal({ asOfDate: asOf, horizonEndDate: horizon, targetCents: goal.targetCents, allocatedCents: goal.allocatedCents, weeklyContributionCents: goal.weeklyContributionCents, contributionStartDate: goal.contributionStartDate as IsoDate, targetDate: goal.targetDate as IsoDate | null });
  const nextDate = staticBefore.nextContributionDate;
  const meetsDeadline = (projection: Projection) => {
    const completion = projection.goals.find(item => item.goalId === goal.id)?.completionDate;
    return Boolean(beforeDate && completion && completion <= beforeDate);
  };
  function recovery(cadence: "once" | "weekly"): { amount: number | null; affordable: boolean | null } {
    if (meetsDeadline(afterProjection)) return { amount: 0, affordable: afterProjection.feasibility === "feasible" };
    if (!beforeDate || !nextDate || nextDate > beforeDate || proposed.extraContributions.length >= 100) return { amount: null, affordable: null };
    const candidate = (amountCents: number): Projection => core(snapshot, { ...proposed, extraContributions: [...proposed.extraContributions, { id: generatedId("recovery", cadence, goal.id), goalId: goal.id, amountCents, date: nextDate!, cadence, endDate: beforeDate! }] }, now).projection;
    // Find the minimum cent amount that actually restores the original date;
    // the ledger accounts for partial final contributions and prior scenarios.
    if (!meetsDeadline(candidate(goalFunding))) return { amount: null, affordable: false };
    let low = 1; let high = goalFunding;
    while (low < high) { const mid = low + Math.floor((high - low) / 2); if (meetsDeadline(candidate(mid))) high = mid; else low = mid + 1; }
    const result = candidate(low);
    return { amount: low, affordable: result.feasibility === "feasible" && meetsDeadline(result) };
  }
  const next = recovery("once"); const weekly = recovery("weekly");
  return { goalId: goal.id, originalDate: beforeDate, revisedDate: afterDate, delayDays: beforeDate && afterDate ? Math.round((parseDate(afterDate, "after").getTime() - parseDate(beforeDate, "before").getTime()) / DAY) : null, nextWeekExtraCents: next.amount, remainingWeeklyExtraCents: weekly.amount, nextWeekAffordable: next.affordable, remainingWeeklyAffordable: weekly.affordable };
}

/** Builds a non-persistent proposed plan and a deterministic before/after comparison. */
export function calculateScenario(snapshot: Snapshot, plan: Plan, request: ScenarioRequest, now: Date): { comparison: ScenarioComparison; proposedPlan: Plan } {
  const parsed = parsePlan(plan); const baseline = core(snapshot, parsed, now);
  const scenario = parseScenario(request);
  if (scenario.snapshotId !== snapshot.id || scenario.planVersion !== parsed.version) fail("scenario does not match the supplied snapshot and plan version.");
  const asOf = asDate(now);
  if (compare(scenario.date as IsoDate, asOf) < 0 || compare(scenario.date as IsoDate, addDays(asOf, HORIZON_DAYS)) > 0) fail("scenario date must be within the two-year forecast window.");
  if (baseline.feasibility === "needs_information") return { proposedPlan: parsed, comparison: { scenarioId: `scenario-${parsed.id}-${scenario.date}`, snapshotId: snapshot.id, planVersion: parsed.version, status: "needs_information", before: baseline.projection, after: null, funding: { discretionaryCents: 0, unallocatedCents: 0, goalCents: 0 }, goalImpacts: [], assumptions: ["Complete stale, missing, or unreconciled information before comparing this scenario."] } };
  if (baseline.feasibility === "infeasible") return { proposedPlan: parsed, comparison: { scenarioId: `scenario-${parsed.id}-${scenario.date}`, snapshotId: snapshot.id, planVersion: parsed.version, status: "baseline_infeasible", before: baseline.projection, after: null, funding: { discretionaryCents: 0, unallocatedCents: 0, goalCents: 0 }, goalImpacts: [], assumptions: ["The current plan already has a cash shortfall, unmet obligation, or unattainable deadline; review its warnings."] } };
  if (scenario.kind === "extra_contribution") {
    if (scenario.goalId === null || !parsed.goals.some((goal) => goal.id === scenario.goalId)) fail("choose a goal for an extra contribution.");
    const proposedPlan: Plan = { ...parsed, extraContributions: [...parsed.extraContributions, { id: generatedId(parsed.id, parsed.version, "extra", scenario.date, parsed.extraContributions.length), goalId: scenario.goalId, amountCents: scenario.amountCents, date: scenario.date, cadence: scenario.cadence }] };
    const after = core(snapshot, proposedPlan, now);
    const goal = parsed.goals.find((item) => item.id === scenario.goalId)!;
    const beforeGoal = baseline.projection.goals.find((item) => item.goalId === goal.id)!;
    const afterGoal = after.projection.goals.find((item) => item.goalId === goal.id)!;
    const impact: GoalImpact = { goalId: goal.id, originalDate: beforeGoal.completionDate, revisedDate: afterGoal.completionDate, delayDays: beforeGoal.completionDate && afterGoal.completionDate ? Math.round((parseDate(afterGoal.completionDate, "after").getTime() - parseDate(beforeGoal.completionDate, "before").getTime()) / DAY) : null, nextWeekExtraCents: null, remainingWeeklyExtraCents: null, nextWeekAffordable: null, remainingWeeklyAffordable: null };
    return { proposedPlan, comparison: { scenarioId: `scenario-${parsed.id}-${scenario.date}`, snapshotId: snapshot.id, planVersion: parsed.version, status: after.feasibility === "feasible" ? "uses_unallocated_cash" : "cash_shortfall", before: baseline.projection, after: after.projection, funding: { discretionaryCents: 0, unallocatedCents: scenario.amountCents, goalCents: 0 }, goalImpacts: [impact], assumptions: ["Extra contributions are simulated as dated outflows and are not saved."] } };
  }
  const discretionaryBucket = discretionaryAvailable(parsed, asOf, scenario.date as IsoDate);
  const discretionary = Math.min(scenario.amountCents, discretionaryBucket);
  const leftAfterDiscretionary = scenario.amountCents - discretionary;
  const unallocated = Math.min(leftAfterDiscretionary, Math.max(0, baseline.capacityFrom(scenario.date as IsoDate) ?? 0));
  let remaining = leftAfterDiscretionary - unallocated;
  let goalFunding = 0;
  if (remaining > 0 && scenario.goalId !== null) {
    const goal = parsed.goals.find((item) => item.id === scenario.goalId);
    if (!goal) fail("selected goal is not in the plan.");
    goalFunding = Math.min(remaining, goal.allocatedCents); remaining -= goalFunding;
  }
  if (remaining > 0) return { proposedPlan: parsed, comparison: { scenarioId: `scenario-${parsed.id}-${scenario.date}`, snapshotId: snapshot.id, planVersion: parsed.version, status: scenario.goalId === null ? "needs_information" : "cash_shortfall", before: baseline.projection, after: null, funding: { discretionaryCents: discretionary, unallocatedCents: unallocated, goalCents: goalFunding }, goalImpacts: [], assumptions: [scenario.goalId === null ? "Choose a goal only if the purchase must use a goal reservation." : "The selected goal reservation cannot cover the remaining purchase amount."] } };
  const purchase = { id: generatedId(parsed.id, parsed.version, "purchase", scenario.date, parsed.plannedPurchases.length), description: "Scenario purchase", amountCents: scenario.amountCents, date: scenario.date, createdAt: now.toISOString(), fundingGoalId: goalFunding > 0 ? scenario.goalId : null, status: "planned" as const, matchedTransactionId: null, funding: { discretionaryCents: discretionary, unallocatedCents: unallocated, goalCents: goalFunding } };
  const proposedPlan: Plan = { ...parsed, plannedPurchases: [...parsed.plannedPurchases, purchase] };
  const after = core(snapshot, proposedPlan, now);
  const impacts = goalFunding > 0 && scenario.goalId ? [recoveryImpact(parsed.goals.find((goal) => goal.id === scenario.goalId)!, goalFunding, now, parsed, proposedPlan, snapshot)] : [];
  const status: ScenarioComparison["status"] = after.feasibility !== "feasible" ? "cash_shortfall" : goalFunding > 0 ? "requires_goal_change" : unallocated > 0 ? "uses_unallocated_cash" : "within_budget";
  return { proposedPlan, comparison: { scenarioId: purchase.id, snapshotId: snapshot.id, planVersion: parsed.version, status, before: baseline.projection, after: after.projection, funding: purchase.funding, goalImpacts: impacts, assumptions: ["Discretionary funding is consumed from its existing dated reservation and is not debited twice.", "Goal reservations remain confirmed allocations; this preview does not mutate the saved plan."] } };
}
