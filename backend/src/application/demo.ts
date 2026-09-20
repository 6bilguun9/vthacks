import { randomUUID } from "node:crypto";
import type { OwnedState } from "../domain/model.js";

export function calendarDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (kind: string) => parts.find(item => item.type === kind)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Explicitly requested synthetic starting data, never a provider-failure fallback. */
export function createDemoState(now: Date, newId: () => string = randomUUID): OwnedState {
  const today = calendarDate(now);
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const snapshotId = newId();
  return {
    snapshot: {
      id: snapshotId, currency: "USD", source: { kind: "fixture", asOf: now.toISOString(), fetchedAt: null, isStale: false },
      accounts: [{ id: "demo-checking", customerId: "synthetic-demo", type: "checking", name: "Sample checking", balanceCents: 150000 }, { id: "demo-savings", customerId: "synthetic-demo", type: "savings", name: "Sample savings", balanceCents: 50000 }],
      campusBalances: [], universityCharges: [], transactions: [],
    },
    plan: { id: newId(), version: 1, snapshotId, timezone: "America/New_York", cashBufferCents: 0, weeklyDiscretionaryCents: 0, discretionaryRemainingCents: 0, selectedBankAccountIds: null, incomeComplete: false, expensesComplete: false, discretionaryPeriodStart: monday.toISOString().slice(0, 10), discretionaryConfirmedAt: null, goals: [], cashFlows: [], plannedPurchases: [], extraContributions: [] },
  };
}
