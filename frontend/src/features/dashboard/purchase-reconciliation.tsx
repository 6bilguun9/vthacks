"use client";

import { useState } from "react";
import type { CommitRequest, OverviewResponse, Plan } from "@/lib/finance-contracts";
import { formatMoney } from "./demo-data";
import { displayDate } from "./live-inputs";
import { LiveField } from "./plan-workspace";

type ReconcileChange = Extract<CommitRequest["change"], { kind: "reconcile_purchase" }>;

export function PurchaseReconciliation({ overview, disabled, onSave }: { overview: OverviewResponse; disabled: boolean; onSave: (change: ReconcileChange) => void }) {
  const outstanding = overview.plan.plannedPurchases.filter(purchase => ["planned", "needs_reconciliation"].includes(purchase.status));
  if (outstanding.length === 0) return null;
  return <section className="panel"><p className="eyebrow">Keep your forecast accurate</p><h2>Purchases you planned</h2><p>These are saved plans, not new bank transactions. After a purchase appears in your snapshot, match it to avoid counting it twice. If you decided against it, cancel the planned entry.</p><div className="live-purchase-list">{outstanding.map(purchase => <PurchaseRow key={purchase.id} purchase={purchase} overview={overview} disabled={disabled} onSave={onSave} />)}</div></section>;
}

function PurchaseRow({ purchase, overview, disabled, onSave }: { purchase: Plan["plannedPurchases"][number]; overview: OverviewResponse; disabled: boolean; onSave: (change: ReconcileChange) => void }) {
  const [transactionId, setTransactionId] = useState("");
  const [action, setAction] = useState<"match" | "cancel" | null>(null);
  const candidates = overview.snapshot.transactions.filter(transaction =>
    ["completed", "executed"].includes(transaction.status.toLowerCase()) &&
    transaction.amountCents === purchase.amountCents &&
    overview.plan.selectedBankAccountIds?.includes(transaction.accountId) &&
    !overview.plan.plannedPurchases.some(item => item.matchedTransactionId === transaction.id));
  return <article><h3>{purchase.description || "Planned purchase"} · {formatMoney(purchase.amountCents)}</h3><p>{displayDate(purchase.date)} · {purchase.status.replaceAll("_", " ")}</p><LiveField label="Completed transaction with the same amount"><select value={transactionId} disabled={disabled || candidates.length === 0} onChange={event => { setTransactionId(event.target.value); setAction(null); }}><option value="">Choose the purchase you recognize</option>{candidates.map(transaction => <option key={transaction.id} value={transaction.id}>{displayDate(transaction.date)} · {transaction.description ?? "Purchase"} · {overview.snapshot.accounts.find(account => account.id === transaction.accountId)?.name ?? "Account"}</option>)}</select></LiveField>{candidates.length === 0 && <p className="live-caption">No eligible completed purchase appears in the selected accounts. Refresh Nessie after the transaction settles.</p>}<div className="live-action-row"><button type="button" className="live-secondary" disabled={disabled || !transactionId} onClick={() => setAction("match")}>Review match</button><button type="button" className="live-text-button" disabled={disabled} onClick={() => setAction("cancel")}>I did not make this purchase</button></div>{action && <div className="live-preview"><p>{action === "match" ? "Confirm this is the same purchase. The backend will update its planning allocations and may ask you to confirm your remaining weekly allowance." : "Remove this planned expense from the forecast? This does not cancel or refund a bank purchase."}</p><div className="live-action-row"><button type="button" className="live-primary" disabled={disabled} onClick={() => onSave({ kind: "reconcile_purchase", purchaseId: purchase.id, action, transactionId: action === "match" ? transactionId : null })}>{action === "match" ? "Confirm transaction match" : "Cancel planned entry"}</button><button type="button" className="live-secondary" disabled={disabled} onClick={() => setAction(null)}>Keep as is</button></div></div>}</article>;
}
