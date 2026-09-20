import type { FinancialSnapshot } from "./financial-snapshot.js";

export type EligibleBankCashStatus = "ready" | "needs_information";

export interface EligibleBankCash {
  readonly status: EligibleBankCashStatus;
  /** Null means the student has not explicitly selected usable bank accounts. */
  readonly eligibleCashCents: number | null;
  readonly selectedAccountIds: readonly string[];
  readonly warnings: readonly string[];
}

function safeAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new RangeError("Eligible bank cash exceeds the supported money range.");
  return result;
}

/**
 * Derives candidate cash only from the checking/savings accounts the student
 * explicitly selected. Credit accounts and all campus balances remain outside
 * this result; a missing or invalid selection asks for information instead of
 * guessing what can fund a plan.
 */
export function deriveEligibleBankCash(snapshot: FinancialSnapshot, selectedAccountIds: readonly string[] | null): EligibleBankCash {
  if (selectedAccountIds === null) {
    return {
      status: "needs_information",
      eligibleCashCents: null,
      selectedAccountIds: [],
      warnings: ["Choose the checking and savings accounts that can support this plan."],
    };
  }

  const uniqueIds = new Set<string>();
  for (const id of selectedAccountIds) {
    if (id.trim().length === 0) throw new RangeError("selected account ID cannot be empty.");
    if (uniqueIds.has(id)) throw new RangeError("selected account IDs must be unique.");
    uniqueIds.add(id);
  }

  const accountsById = new Map(snapshot.accounts.map((account) => [account.id, account]));
  const unavailable: string[] = [];
  let eligibleCashCents = 0;
  for (const id of selectedAccountIds) {
    const account = accountsById.get(id);
    if (!account) {
      unavailable.push(id);
      continue;
    }
    if (account.type === "credit") {
      unavailable.push(id);
      continue;
    }
    eligibleCashCents = safeAdd(eligibleCashCents, account.balanceCents);
  }

  if (unavailable.length > 0) {
    return {
      status: "needs_information",
      eligibleCashCents: null,
      selectedAccountIds: [...selectedAccountIds],
      warnings: [`Selected accounts are unavailable for plan cash: ${unavailable.join(", ")}. Choose checking or savings accounts only.`],
    };
  }

  return {
    status: "ready",
    eligibleCashCents,
    selectedAccountIds: [...selectedAccountIds],
    warnings: [],
  };
}
