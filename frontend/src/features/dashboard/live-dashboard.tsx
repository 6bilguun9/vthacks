"use client";

import { useState } from "react";
import Link from "next/link";
import { refreshBankData } from "@/lib/api";
import type { OverviewResponse } from "@/lib/finance-contracts";
import { useFinancialSession } from "@/features/session/financial-session";
import ChatPanel from "@/features/chat/ChatPanel";
import { formatMoney } from "./demo-data";
import { displayDate } from "./live-inputs";
import { PlanWorkspace, ProjectionSummary } from "./plan-workspace";
import { ScenarioForm } from "./scenario-form";
import { ManualDataForm } from "./manual-data-form";
import { usePlanCommit } from "./use-plan-commit";
import { PurchaseReconciliation } from "./purchase-reconciliation";
import "./live-dashboard.css";

export type LiveView = "main" | "activity" | "savings" | "finbot";

export function LiveDashboard({ view }: { view: LiveView }) {
  const session = useFinancialSession();
  if (!session.overview || session.status !== "ready") return <section className="panel live-empty"><p className="eyebrow">Connected planning</p><h2>{session.status === "needs_bootstrap" ? "Your plan starts here" : "Connect your saved plan"}</h2><p>{session.status === "needs_bootstrap" ? "Use Create my sample plan in the connection menu to create a private sandbox plan. You’ll confirm its inputs before calculating a forecast." : session.status === "loading" || session.status === "connecting" ? "Loading your guest session and plan…" : "Open the connection menu to continue. Your live view will appear after the backend verifies your session."}</p>{session.error && <p className="live-error" role="alert">{session.error}</p>}</section>;
  return <ConnectedViews key={session.userId} view={view} overview={session.overview} />;
}

function ConnectedViews({ view, overview }: { view: LiveView; overview: OverviewResponse }) {
  const { getAccessToken, reload, userId } = useFinancialSession();
  const mutation = usePlanCommit();
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const blocked = mutation.busy || mutation.pending !== null || !mutation.ready || refreshing;
  const revisionKey = `${overview.snapshot.id}:${overview.plan.version}`;
  const source = overview.snapshot.source;
  const sourceName = source.kind === "nessie_sandbox" ? "Nessie sandbox" : source.kind === "fixture" ? "Synthetic sample" : "Manual entry";

  async function refresh() {
    if (blocked) return;
    setRefreshing(true); setNotice("");
    try { await refreshBankData({ accessToken: await getAccessToken() }); await reload(); }
    catch { setNotice("The refresh could not be confirmed. Reload your saved plan before trying again; it may already contain a newer snapshot."); try { await reload(); } catch { /* The connection menu offers an explicit reload. */ } }
    finally { setRefreshing(false); }
  }

  return <div className="live-dashboard" lang="en" dir="ltr">
    <div className="live-data-label"><span><b>{sourceName}</b> · Saved plan version {overview.plan.version}</span><span>As of {displayDate(source.asOf)}{source.isStale ? " · Stale snapshot" : ""}</span></div>
    <p className="live-caption">Connected to the backend. {source.kind === "fixture" ? "Balances are synthetic fixtures, not your actual accounts." : source.kind === "nessie_sandbox" ? "Banking data comes from the Nessie sandbox, not a real bank account." : "Balances come from manually supplied information."} Campus funds remain separate from bank cash.</p>
    {mutation.message && <p className="live-result" role="status">{mutation.message}</p>}
    {mutation.pending && <section className="live-pending" role="status"><strong>A save still needs confirmation.</strong><p>Retry checks the same request without creating a duplicate. Other edits are paused until it is resolved.</p><button type="button" className="live-primary" disabled={mutation.busy} onClick={() => void mutation.save()}>{mutation.busy ? "Checking save…" : "Retry pending save"}</button></section>}
    {view === "finbot" ? <div className="chat-view"><ChatPanel key={`live:${userId}`} /></div> : <>
      {view === "main" && <>
        <div className="live-overview-grid"><section className="panel"><p className="eyebrow">Account snapshot</p><h2>Your accounts</h2><p className="live-caption">Only selected checking and savings accounts fund the plan. Credit balances are not spendable cash.</p>{overview.snapshot.accounts.length === 0 ? <p>No sandbox accounts were returned.</p> : <ul className="live-account-list">{overview.snapshot.accounts.map(account => <li key={account.id}><span>{account.name}<small>{account.type} {overview.plan.selectedBankAccountIds?.includes(account.id) ? "· Included in plan" : "· Not selected"}</small></span><strong>{formatMoney(account.balanceCents)}</strong></li>)}</ul>}<button type="button" className="live-secondary" disabled={blocked || !overview.capabilities?.nessieConfigured} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh Nessie snapshot"}</button>{!overview.capabilities?.nessieConfigured && <p className="live-caption">A sandbox customer must be configured by the backend team before refreshing.</p>}</section>
        <section className="panel"><p className="eyebrow">Restricted funds</p><h2>Campus balances</h2>{overview.snapshot.campusBalances.length === 0 ? <p>Add your campus balances below.</p> : <ul className="live-account-list">{overview.snapshot.campusBalances.map(balance => <li key={balance.id}><span>{balance.name}<small>{balance.restriction}<br />{balance.source.kind} · {displayDate(balance.source.asOf)}</small></span><strong>{formatMoney(balance.balanceCents)}</strong></li>)}</ul>}<Link className="live-link" href="/dining">Plan a week of meals →</Link></section></div>
        {notice && <p className="live-error" role="alert">{notice}</p>}
        <section className="panel"><h2>Your plan at a glance</h2><ProjectionSummary projection={overview.projection} /><div className="live-inline-stats"><p>Cash buffer <strong>{formatMoney(overview.plan.cashBufferCents)}</strong></p><p>Weekly discretionary budget <strong>{formatMoney(overview.plan.weeklyDiscretionaryCents)}</strong></p><p>Reported amount remaining <strong>{formatMoney(overview.plan.discretionaryRemainingCents)}</strong></p></div><p className="live-caption">Remaining allowance requires confirmation for the current week. Confirm your planning inputs in Savings.</p><Link className="live-link" href="/#savings">Review goals and planning inputs →</Link></section>
        <details className="panel live-disclosure"><summary>Campus balances and university charges</summary><ManualDataForm key={revisionKey} overview={overview} onSaved={reload} disabled={blocked} /></details>
      </>}
      {view === "activity" && <section className="panel"><h2>Bank activity</h2><p className="live-caption">Purchases in the saved {sourceName.toLowerCase()} snapshot.</p>{overview.snapshot.transactions.length === 0 ? <p>No purchases in this snapshot. A refresh can load purchases from your configured Nessie sandbox customer.</p> : <ul className="live-account-list">{overview.snapshot.transactions.map(item => <li key={item.id}><span>{item.description ?? "Purchase"}<small>{displayDate(item.date)} · {item.status} · {item.source}</small></span><strong>{formatMoney(item.amountCents)}</strong></li>)}</ul>}</section>}
      {view === "activity" && <PurchaseReconciliation key={revisionKey} overview={overview} disabled={blocked} onSave={change => void mutation.save({ expectedVersion: overview.plan.version, snapshotId: overview.snapshot.id, change })} />}
      {view === "savings" && <><section className="panel"><p className="eyebrow">Your saved goals</p><h2>Plans for what comes next</h2>{overview.plan.goals.length === 0 ? <p>Add your first goal in the planning inputs below.</p> : <div className="live-goals">{overview.plan.goals.map(goal => { const projection = overview.projection.goals.find(item => item.goalId === goal.id); return <article key={goal.id}><h3>{goal.name}</h3><p><strong>{formatMoney(goal.allocatedCents)}</strong> allocated of {formatMoney(goal.targetCents)}</p><progress value={goal.allocatedCents} max={goal.targetCents} aria-label={`${goal.name} allocated savings`} /><p>Projected completion: {displayDate(projection?.completionDate ?? null)}</p><p>Required weekly contribution: {projection?.requiredWeeklyCents == null ? "Not available" : formatMoney(projection.requiredWeeklyCents)}</p><small>Allocated savings are already included in bank cash.</small></article>; })}</div>}</section>
        <PlanWorkspace key={`plan:${revisionKey}`} overview={overview} saving={blocked} onSave={plan => void mutation.save({ expectedVersion: overview.plan.version, snapshotId: overview.snapshot.id, change: { kind: "replace_plan", plan } })} />
        <ScenarioForm key={`scenario:${revisionKey}`} overview={overview} disabled={blocked} onSave={scenario => void mutation.save({ expectedVersion: overview.plan.version, snapshotId: overview.snapshot.id, change: { kind: "apply_scenario", scenario } })} />
      </>}
    </>}
  </div>;
}
