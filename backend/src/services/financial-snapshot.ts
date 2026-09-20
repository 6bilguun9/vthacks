import { z } from "zod";
import type { NessieAccount } from "../integrations/nessie.js";
import type { IsoDate } from "../finance/goal-projection.js";

export type SnapshotSourceKind = "nessie_sandbox" | "manual" | "fixture";

export interface SnapshotSourceInfo {
  readonly kind: SnapshotSourceKind;
  readonly asOf: string;
  readonly fetchedAt: string | null;
  readonly isStale: boolean;
}

export interface CampusBalanceInput {
  readonly id: string;
  readonly name: string;
  readonly balanceCents: number;
  readonly restriction: string;
  readonly source: SnapshotSourceInfo;
}

export interface UniversityChargeInput {
  readonly id: string;
  readonly name: string;
  readonly amountCents: number;
  readonly dueDate: IsoDate | null;
  readonly fundingGoalId: string | null;
  readonly source: SnapshotSourceInfo;
}

export interface FinancialSnapshotInput {
  readonly id: string;
  readonly bankSource: SnapshotSourceInfo;
  readonly nessieAccounts: readonly NessieAccount[];
  readonly campusBalances: readonly CampusBalanceInput[];
  readonly universityCharges: readonly UniversityChargeInput[];
}

export interface FinancialSnapshot {
  readonly id: string;
  readonly currency: "USD";
  readonly source: SnapshotSourceInfo;
  readonly accounts: readonly NessieAccount[];
  readonly campusBalances: readonly CampusBalanceInput[];
  readonly universityCharges: readonly UniversityChargeInput[];
}

const isoDateTime = z.string().datetime({ offset: true });

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new RangeError(`${field} cannot be empty.`);
}

function assertSafeInteger(value: number, field: string, minimum?: number): void {
  if (!Number.isSafeInteger(value) || (minimum !== undefined && value < minimum)) {
    throw new RangeError(`${field} must be a${minimum === undefined ? "" : `t least ${minimum}`} safe integer.`);
  }
}

function validateIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError(`${field} must be an ISO calendar date.`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== (month ?? 1) - 1 || date.getUTCDate() !== day) throw new RangeError(`${field} must be a real calendar date.`);
}

function validateSource(source: SnapshotSourceInfo, field: string, allowedKinds: readonly SnapshotSourceKind[]): SnapshotSourceInfo {
  if (!allowedKinds.includes(source.kind)) throw new RangeError(`${field}.kind is not allowed for this data.`);
  if (!isoDateTime.safeParse(source.asOf).success) throw new RangeError(`${field}.asOf must be an ISO timestamp with an offset.`);
  if (source.fetchedAt !== null && !isoDateTime.safeParse(source.fetchedAt).success) throw new RangeError(`${field}.fetchedAt must be an ISO timestamp with an offset or null.`);
  return { kind: source.kind, asOf: source.asOf, fetchedAt: source.fetchedAt, isStale: source.isStale };
}

function assertUniqueIds<T extends { readonly id: string }>(records: readonly T[], field: string): void {
  const ids = new Set<string>();
  for (const record of records) {
    assertNonEmpty(record.id, `${field} id`);
    if (ids.has(record.id)) throw new RangeError(`${field} IDs must be unique.`);
    ids.add(record.id);
  }
}

/**
 * Creates the service-layer representation that mirrors the shared financial
 * snapshot contract. It preserves bank cash, restricted campus balances, and
 * charges as distinct collections so later plan calculations cannot silently
 * double-count or spend restricted funds.
 */
export function buildFinancialSnapshot(input: FinancialSnapshotInput): FinancialSnapshot {
  assertNonEmpty(input.id, "snapshot id");
  const bankSource = validateSource(input.bankSource, "bankSource", ["nessie_sandbox", "fixture"]);
  assertUniqueIds(input.nessieAccounts, "bank account");
  assertUniqueIds(input.campusBalances, "campus balance");
  assertUniqueIds(input.universityCharges, "university charge");

  const campusBalances = input.campusBalances.map((balance) => {
    assertNonEmpty(balance.name, `campus balance ${balance.id}.name`);
    assertNonEmpty(balance.restriction, `campus balance ${balance.id}.restriction`);
    assertSafeInteger(balance.balanceCents, `campus balance ${balance.id}.balanceCents`);
    return {
      id: balance.id,
      name: balance.name,
      balanceCents: balance.balanceCents,
      restriction: balance.restriction,
      source: validateSource(balance.source, `campus balance ${balance.id}.source`, ["manual", "fixture"]),
    };
  });

  const universityCharges = input.universityCharges.map((charge) => {
    assertNonEmpty(charge.name, `university charge ${charge.id}.name`);
    assertSafeInteger(charge.amountCents, `university charge ${charge.id}.amountCents`, 0);
    if (charge.dueDate !== null) validateIsoDate(charge.dueDate, `university charge ${charge.id}.dueDate`);
    if (charge.fundingGoalId !== null) assertNonEmpty(charge.fundingGoalId, `university charge ${charge.id}.fundingGoalId`);
    return {
      id: charge.id,
      name: charge.name,
      amountCents: charge.amountCents,
      dueDate: charge.dueDate,
      fundingGoalId: charge.fundingGoalId,
      source: validateSource(charge.source, `university charge ${charge.id}.source`, ["manual", "fixture"]),
    };
  });

  return {
    id: input.id,
    currency: "USD",
    source: bankSource,
    accounts: input.nessieAccounts.map((account) => ({ ...account })),
    campusBalances,
    universityCharges,
  };
}
