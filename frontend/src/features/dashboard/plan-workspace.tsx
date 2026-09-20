"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { previewPlan } from "@/lib/api";
import { planSchema, type OverviewResponse, type Plan, type Projection } from "@/lib/finance-contracts";
import { useFinancialSession } from "@/features/session/financial-session";
import { formatMoney } from "./demo-data";
import { centsInput, displayDate, dollarsToCents, weekStart } from "./live-inputs";

export function LiveField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="live-field"><span>{label}</span>{children}</label>;
}

export function ProjectionSummary({ projection }: { projection: Projection }) {
  const labels = { feasible: "Plan fits the supplied inputs", infeasible: "This plan needs an adjustment", needs_information: "More information is needed" };
  return <div className="live-projection" role="status"><strong>{labels[projection.feasibility]}</strong>
    {projection.minimumUnallocatedCashCents !== null && <p>Lowest projected unallocated cash: {formatMoney(projection.minimumUnallocatedCashCents)}.</p>}
    {projection.warnings.length > 0 && <ul>{projection.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
    <p>Forecast as of {displayDate(projection.asOf)}. Results use the information supplied to the server.</p>
    {projection.assumptions.length > 0 && <details><summary>Forecast assumptions</summary><ul>{projection.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
  </div>;
}

type Preview = { proposedPlan: Plan; projection: Projection };

export function PlanWorkspace({ overview, saving, onSave }: { overview: OverviewResponse; saving: boolean; onSave: (plan: Plan) => void }) {
  const { getAccessToken } = useFinancialSession();
  const [goals, setGoals] = useState(overview.plan.goals);
  const [flows, setFlows] = useState(overview.plan.cashFlows);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = overview.capabilities?.today ?? overview.projection.asOf;
  const goalInUse = (id: string) => overview.plan.extraContributions.some(item => item.goalId === id) || overview.plan.plannedPurchases.some(item => item.fundingGoalId === id && ["planned", "needs_reconciliation"].includes(item.status)) || overview.snapshot.universityCharges.some(item => item.fundingGoalId === id);
  const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saving) return;
    const data = new FormData(event.currentTarget);
    setError(""); setPreview(null); setBusy(true);
    try {
      const proposed = planSchema.parse({
        ...overview.plan,
        cashBufferCents: dollarsToCents(value(data, "buffer")),
        weeklyDiscretionaryCents: dollarsToCents(value(data, "weekly")),
        discretionaryRemainingCents: dollarsToCents(value(data, "remaining")),
        discretionaryPeriodStart: value(data, "period"),
        discretionaryConfirmedAt: data.has("confirmRemaining") ? new Date().toISOString() : null,
        selectedBankAccountIds: data.getAll("accounts").map(String),
        incomeComplete: data.has("incomeComplete"), expensesComplete: data.has("expensesComplete"),
        goals: goals.map((goal, i) => ({ ...goal, name: value(data, `goal${i}.name`), targetCents: dollarsToCents(value(data, `goal${i}.target`)), allocatedCents: dollarsToCents(value(data, `goal${i}.allocated`)), weeklyContributionCents: dollarsToCents(value(data, `goal${i}.weekly`)), contributionStartDate: value(data, `goal${i}.start`), targetDate: value(data, `goal${i}.deadline`) || null })),
        cashFlows: flows.map((flow, i) => ({ ...flow, description: value(data, `flow${i}.name`), kind: value(data, `flow${i}.kind`), amountCents: dollarsToCents(value(data, `flow${i}.amount`)), cadence: value(data, `flow${i}.cadence`), nextDate: value(data, `flow${i}.date`), endDate: value(data, `flow${i}.end`) || null, certainty: value(data, `flow${i}.certainty`) })),
      });
      setPreview(await previewPlan({ expectedVersion: overview.plan.version, snapshotId: overview.snapshot.id, proposedPlan: proposed }, { accessToken: await getAccessToken() }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The plan could not be previewed."); }
    finally { setBusy(false); }
  }

  return <section className="panel live-plan-editor"><div className="section-heading"><div><p className="eyebrow">Your planning inputs</p><h2>Build a plan you can check</h2></div></div>
    <p>Confirm your accounts and schedules, then preview the result. Only Save plan stores these edits.</p>
    <form onSubmit={submit} onChange={() => setPreview(null)}>
      <fieldset disabled={busy || saving}>
        <legend>Accounts to include</legend><div className="live-checks">{overview.snapshot.accounts.filter(account => ["checking", "savings"].includes(account.type)).map(account => <label key={account.id}><input type="checkbox" name="accounts" value={account.id} defaultChecked={overview.plan.selectedBankAccountIds?.includes(account.id) ?? false} />{account.name} · {formatMoney(account.balanceCents)}</label>)}</div>
        <div className="live-form-grid"><LiveField label="Cash buffer ($)"><input name="buffer" type="number" min="0" step="0.01" defaultValue={centsInput(overview.plan.cashBufferCents)} required /></LiveField><LiveField label="Weekly discretionary budget ($)"><input name="weekly" type="number" min="0" step="0.01" defaultValue={centsInput(overview.plan.weeklyDiscretionaryCents)} required /></LiveField><LiveField label="Discretionary money left this week ($)"><input name="remaining" type="number" min="0" step="0.01" defaultValue={centsInput(overview.plan.discretionaryRemainingCents)} required /></LiveField><LiveField label="Current week begins (Monday)"><input name="period" type="date" defaultValue={weekStart(today)} required /></LiveField></div>
        <label className="live-check"><input name="confirmRemaining" type="checkbox" />I confirm the remaining amount for the week shown.</label>
        <div className="live-editor-heading"><h3>Income and essential bills</h3><button type="button" className="live-secondary" disabled={flows.length >= 100} onClick={() => { setPreview(null); setFlows([...flows, { id: crypto.randomUUID(), kind: "income", description: "", amountCents: 0, cadence: "once", nextDate: today, endDate: null, certainty: "confirmed" }]); }}>Add income or bill</button></div>
        {flows.map((flow, i) => <div className="live-editor-row" key={flow.id}><div className="live-form-grid"><LiveField label="Description"><input name={`flow${i}.name`} defaultValue={flow.description} maxLength={200} required /></LiveField><LiveField label="Type"><select name={`flow${i}.kind`} defaultValue={flow.kind}><option value="income">Income</option><option value="essential">Essential bill</option></select></LiveField><LiveField label="Amount ($)"><input name={`flow${i}.amount`} type="number" min="0.01" step="0.01" defaultValue={centsInput(flow.amountCents)} required /></LiveField><LiveField label="Repeats"><select name={`flow${i}.cadence`} defaultValue={flow.cadence}>{["once", "weekly", "biweekly", "monthly"].map(value => <option key={value} value={value}>{value}</option>)}</select></LiveField><LiveField label="Next date"><input name={`flow${i}.date`} type="date" defaultValue={flow.nextDate} required /></LiveField><LiveField label="End date (optional)"><input name={`flow${i}.end`} type="date" defaultValue={flow.endDate ?? ""} /></LiveField><LiveField label="How certain is this amount?"><select name={`flow${i}.certainty`} defaultValue={flow.certainty}><option value="confirmed">Confirmed</option><option value="estimated">Estimated</option></select></LiveField></div><button className="live-text-button" type="button" onClick={() => { setPreview(null); setFlows(flows.filter(item => item.id !== flow.id)); }}>Remove this entry from proposed plan</button></div>)}
        <div className="live-checks"><label><input name="incomeComplete" type="checkbox" defaultChecked={overview.plan.incomeComplete} />I have listed all expected income, including none if applicable.</label><label><input name="expensesComplete" type="checkbox" defaultChecked={overview.plan.expensesComplete} />I have listed all essential bills, including none if applicable.</label></div>
        <div className="live-editor-heading"><h3>Savings goals</h3><button type="button" className="live-secondary" disabled={goals.length >= 20} onClick={() => { setPreview(null); setGoals([...goals, { id: crypto.randomUUID(), name: "", targetCents: 0, allocatedCents: 0, weeklyContributionCents: 0, contributionStartDate: today, targetDate: null }]); }}>Add a goal</button></div>
        <p className="live-caption">Allocated savings are already part of your bank balance. List tuition charges under Campus balances and charges.</p>
        {goals.map((goal, i) => <div className="live-editor-row" key={goal.id}><div className="live-form-grid"><LiveField label="Goal name"><input name={`goal${i}.name`} defaultValue={goal.name} maxLength={100} required /></LiveField><LiveField label="Target ($)"><input name={`goal${i}.target`} type="number" min="0.01" step="0.01" defaultValue={centsInput(goal.targetCents)} required /></LiveField><LiveField label="Already allocated ($)"><input name={`goal${i}.allocated`} type="number" min="0" step="0.01" defaultValue={centsInput(goal.allocatedCents)} required /></LiveField><LiveField label="Weekly contribution ($)"><input name={`goal${i}.weekly`} type="number" min="0" step="0.01" defaultValue={centsInput(goal.weeklyContributionCents)} required /></LiveField><LiveField label="Contributions start"><input name={`goal${i}.start`} type="date" defaultValue={goal.contributionStartDate} required /></LiveField><LiveField label="Target date (optional)"><input name={`goal${i}.deadline`} type="date" defaultValue={goal.targetDate ?? ""} /></LiveField></div><button className="live-text-button" type="button" disabled={goalInUse(goal.id)} title={goalInUse(goal.id) ? "This goal is linked to saved contributions, purchases, or university charges." : undefined} onClick={() => { setPreview(null); setGoals(goals.filter(item => item.id !== goal.id)); }}>{goalInUse(goal.id) ? "Goal has linked planning entries" : "Remove this goal from proposed plan"}</button></div>)}
        <button className="live-primary" type="submit">{busy ? "Calculating…" : "Preview plan"}</button>
      </fieldset>
    </form>
    {error && <p className="live-error" role="alert">{error}</p>}
    {preview && <div className="live-preview"><ProjectionSummary projection={preview.projection} /><ul>{preview.projection.goals.map(goal => <li key={goal.goalId}>{preview.proposedPlan.goals.find(item => item.id === goal.goalId)?.name}: {displayDate(goal.completionDate)}</li>)}</ul><button type="button" className="live-primary" disabled={saving || busy} onClick={() => onSave(preview.proposedPlan)}>Save plan</button></div>}
  </section>;
}
