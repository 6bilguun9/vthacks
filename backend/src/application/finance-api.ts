import { createHash, randomUUID } from "node:crypto";
import type { AppConfig } from "../config/env.js";
import { AppError, canonicalJson, type Actor, type OwnedState, type Plan, type ScenarioRequest, type Snapshot, commitSchema, manualSchema } from "../domain/model.js";
import type { Repository } from "../domain/ports.js";
import type { z } from "zod";
import { createNessieClient } from "../integrations/nessie.js";
import { buildFinancialSnapshot } from "../services/financial-snapshot.js";
import { calculatePlan, calculateScenario } from "../services/planning.js";
import { createDemoState, calendarDate } from "./demo.js";
import type { IsoDate } from "../finance/goal-projection.js";

export function publicSnapshot(snapshot: Snapshot) {
  return { ...snapshot, accounts: snapshot.accounts.map(({ id, name, type, balanceCents }) => ({ id, name, type, balanceCents })) };
}
export function assertCurrent(state: OwnedState, version: number, snapshotId: string) {
  if (state.plan.version !== version || state.snapshot.id !== snapshotId) throw new AppError(409, "STALE_PLAN", "Reload the latest plan and preview this change again.");
}
function assertPlanIdentity(current: Plan, next: Plan) {
  if (next.id !== current.id || next.version !== current.version || next.snapshotId !== current.snapshotId) throw new AppError(409, "STALE_PLAN", "The proposed plan does not match the current plan.");
  // Planned expenses and their reconciliation are changed only by explicit scenarios/reconciliation.
  if (canonicalJson(next.plannedPurchases) !== canonicalJson(current.plannedPurchases) || canonicalJson(next.extraContributions) !== canonicalJson(current.extraContributions)) throw new AppError(422, "INVALID_REQUEST", "Use a scenario or reconciliation to change saved planned purchases and extra contributions.");
}
function deduplicate<T extends { id: string }>(records: readonly T[]): T[] {
  const unique = new Map<string, T>();
  for (const record of records) {
    const previous = unique.get(record.id);
    if (previous && canonicalJson(previous) !== canonicalJson(record)) throw new Error("Conflicting provider records");
    unique.set(record.id, record);
  }
  return [...unique.values()];
}

export function createFinanceApi(config: AppConfig, repository: Repository, clock: () => Date = () => new Date(), newId: () => string = randomUUID, fetcher: typeof fetch = fetch) {
  async function overview(actor: Actor) { const state = await repository.load(actor); return { ...state, projection: calculatePlan(state.snapshot, state.plan, clock()) }; }
  async function scenario(actor: Actor, request: ScenarioRequest) {
    const state = await repository.load(actor); assertCurrent(state, request.planVersion, request.snapshotId);
    return { ...calculateScenario(state.snapshot, state.plan, request, clock()).comparison, scenarioId: newId() };
  }
  return {
    overview, scenario,
    async bootstrap(actor: Actor) { const state = await repository.bootstrap(actor, createDemoState(clock(), newId)); return { ...state, projection: calculatePlan(state.snapshot, state.plan, clock()) }; },
    async preview(actor: Actor, version: number, snapshotId: string, proposedPlan: Plan) {
      const state = await repository.load(actor); assertCurrent(state, version, snapshotId); assertPlanIdentity(state.plan, proposedPlan);
      return { proposedPlan, projection: calculatePlan(state.snapshot, proposedPlan, clock()) };
    },
    async commit(actor: Actor, input: z.infer<typeof commitSchema>) {
      const hash = createHash("sha256").update(canonicalJson(input)).digest("hex");
      const previous = await repository.lookupCommit(actor, input.idempotencyKey, hash); if (previous) return previous;
      const state = await repository.load(actor); assertCurrent(state, input.expectedVersion, input.snapshotId);
      let proposed: Plan;
      if (input.change.kind === "replace_plan") { proposed = input.change.plan; assertPlanIdentity(state.plan, proposed); }
      else if (input.change.kind === "apply_scenario") {
        assertCurrent(state, input.change.scenario.planVersion, input.change.scenario.snapshotId);
        const result = calculateScenario(state.snapshot, state.plan, input.change.scenario, clock());
        if (!result.comparison.after || ["needs_information", "baseline_infeasible", "cash_shortfall"].includes(result.comparison.status)) throw new AppError(422, "SCENARIO_NOT_APPLICABLE", "Resolve the scenario's missing information or funding shortfall before saving.");
        proposed = result.proposedPlan;
      } else {
        const change = input.change;
        const purchase = state.plan.plannedPurchases.find(item => item.id === change.purchaseId);
        if (!purchase || !["planned", "needs_reconciliation"].includes(purchase.status)) throw new AppError(422, "INVALID_REQUEST", "Choose an outstanding purchase to reconcile.");
        if (change.action === "cancel" && change.transactionId !== null) throw new AppError(422, "INVALID_REQUEST", "Canceled purchases cannot be matched to a transaction.");
        if (change.action === "match") {
          const transaction = state.snapshot.transactions.find(item => item.id === change.transactionId);
          if (!transaction || !["completed", "executed"].includes(transaction.status.toLowerCase()) || transaction.amountCents !== purchase.amountCents || !state.plan.selectedBankAccountIds?.includes(transaction.accountId) || state.plan.plannedPurchases.some(item => item.matchedTransactionId === transaction.id)) throw new AppError(422, "INVALID_REQUEST", "Choose a matching completed transaction in the selected accounts that has not already been matched.");
        }
        const goal = state.plan.goals.find(item => item.id === purchase.fundingGoalId);
        if (change.action === "match" && purchase.funding.goalCents > 0 && (!goal || goal.allocatedCents < purchase.funding.goalCents)) throw new AppError(422, "INVALID_REQUEST", "Confirm the selected goal's allocation before reconciling this purchase.");
        proposed = { ...state.plan,
          goals: state.plan.goals.map(item => change.action === "match" && item.id === purchase.fundingGoalId ? { ...item, allocatedCents: item.allocatedCents - purchase.funding.goalCents } : item),
          discretionaryConfirmedAt: change.action === "match" && purchase.funding.discretionaryCents > 0 ? null : state.plan.discretionaryConfirmedAt,
          plannedPurchases: state.plan.plannedPurchases.map(item => item.id === purchase.id ? { ...item, status: change.action === "match" ? "completed" as const : "canceled" as const, matchedTransactionId: change.transactionId } : item),
        };
      }
      calculatePlan(state.snapshot, proposed, clock());
      return repository.commit(actor, input.expectedVersion, input.snapshotId, input.idempotencyKey, hash, proposed);
    },
    async manual(actor: Actor, input: z.infer<typeof manualSchema>) {
      const state = await repository.load(actor); assertCurrent(state, input.expectedVersion, input.snapshotId);
      const now = clock();
      const source = (asOf: string) => { if (Date.parse(asOf) > now.getTime()) throw new AppError(422, "INVALID_REQUEST", "Manual information cannot be dated in the future."); return { kind: "manual" as const, asOf, fetchedAt: null, isStale: false }; };
      const snapshot: Snapshot = { ...buildFinancialSnapshot({ id: newId(), bankSource: state.snapshot.source, nessieAccounts: state.snapshot.accounts, campusBalances: input.campusBalances.map(({ asOf, ...entry }) => ({ ...entry, source: source(asOf) })), universityCharges: input.universityCharges.map(({ asOf, ...entry }) => ({ ...entry, dueDate: entry.dueDate as IsoDate | null, source: source(asOf) })) }), transactions: state.snapshot.transactions };
      return repository.replaceSnapshot(actor, input.expectedVersion, input.snapshotId, snapshot);
    },
    async refresh(actor: Actor) {
      const state = await repository.load(actor);
      if (!config.NESSIE_API_KEY || !config.NESSIE_CUSTOMER_ID) throw new AppError(503, "NESSIE_UNAVAILABLE", "Configure a Nessie sandbox customer before refreshing. The saved snapshot is unchanged.");
      const refreshSignal = AbortSignal.timeout(30_000);
      const boundedFetch: typeof fetch = (input, init) => fetcher(input, { ...init, signal: AbortSignal.any([refreshSignal, ...(init?.signal ? [init.signal] : [])]) });
      const client = createNessieClient({ baseUrl: config.NESSIE_BASE_URL, apiKey: config.NESSIE_API_KEY, fetch: boundedFetch });
      try {
        const records = await client.listCustomerAccounts(config.NESSIE_CUSTOMER_ID);
        if (records.length > 20 || records.some(account => account.customerId !== config.NESSIE_CUSTOMER_ID)) throw new Error("Invalid customer accounts");
        const accounts = deduplicate(records);
        const transactions: Snapshot["transactions"][number][] = [];
        // Small sequential batches bound provider fan-out.
        for (const account of accounts) {
          const purchases = await client.listAccountPurchases(account.id);
          if (purchases.length > 1000) throw new Error("Too many transactions");
          for (const purchase of purchases) transactions.push({ id: `nessie:purchase:${purchase.id}`, accountId: account.id, date: purchase.date, amountCents: purchase.amountCents, status: purchase.status, description: purchase.description, source: "nessie_sandbox" });
        }
        const timestamp = clock().toISOString();
        const snapshot: Snapshot = { ...buildFinancialSnapshot({ id: newId(), bankSource: { kind: "nessie_sandbox", asOf: timestamp, fetchedAt: timestamp, isStale: false }, nessieAccounts: accounts, campusBalances: state.snapshot.campusBalances, universityCharges: state.snapshot.universityCharges }), transactions: deduplicate(transactions) };
        return await repository.replaceSnapshot(actor, state.plan.version, state.snapshot.id, snapshot);
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(502, "NESSIE_PROVIDER_ERROR", "Nessie could not be refreshed. The previous saved snapshot is unchanged; check its timestamp.");
      }
    },
    capabilities(actor: Actor) { return { ai: config.AI_MODE === "presenter" && config.PRESENTER_USER_IDS.includes(actor.userId), nessieConfigured: Boolean(config.NESSIE_API_KEY && config.NESSIE_CUSTOMER_ID), today: calendarDate(clock()) }; },
  };
}
