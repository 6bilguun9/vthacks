"use client";

import { useState, type FormEvent } from "react";
import { compareScenario } from "@/lib/api";
import type { OverviewResponse, ScenarioComparison, ScenarioRequest } from "@/lib/finance-contracts";
import { useFinancialSession } from "@/features/session/financial-session";
import { LiveField, ProjectionSummary } from "./plan-workspace";
import { displayDate, dollarsToCents } from "./live-inputs";
import { formatMoney } from "./demo-data";

export function ScenarioForm({ overview, disabled, onSave }: { overview: OverviewResponse; disabled: boolean; onSave: (request: ScenarioRequest) => void }) {
  const { getAccessToken } = useFinancialSession();
  const [kind, setKind] = useState<"purchase" | "extra_contribution">("purchase");
  const [result, setResult] = useState<{ request: ScenarioRequest; comparison: ScenarioComparison } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(""); setResult(null);
    try {
      const request: ScenarioRequest = { snapshotId: overview.snapshot.id, planVersion: overview.plan.version, kind, amountCents: dollarsToCents(String(data.get("amount"))), date: String(data.get("date")), cadence: kind === "purchase" ? "once" : data.get("cadence") === "weekly" ? "weekly" : "once", goalId: String(data.get("goal")) || null };
      setResult({ request, comparison: await compareScenario(request, { accessToken: await getAccessToken() }) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The scenario could not be calculated."); }
    finally { setBusy(false); }
  }
  const comparison = result?.comparison;
  const canApply = comparison?.after && !["needs_information", "baseline_infeasible", "cash_shortfall"].includes(comparison.status);
  const affordability = (value: boolean | null) => value === null ? "Not checked" : value ? "Fits supplied inputs" : "Does not fit supplied inputs";
  return <section className="panel live-scenario"><p className="eyebrow">Before you decide</p><h2>See what a change would do</h2><p>A hypothetical preview. Your plan stays unchanged until you save.</p>
    <form onSubmit={submit} onChange={() => setResult(null)}><fieldset disabled={busy || disabled}><div className="live-form-grid">
      <LiveField label="What would you like to check?"><select value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="purchase">A purchase</option><option value="extra_contribution">An extra savings contribution</option></select></LiveField>
      <LiveField label="Amount ($)"><input name="amount" type="number" step="0.01" min="0.01" required /></LiveField>
      <LiveField label="Date"><input name="date" type="date" defaultValue={overview.capabilities?.today ?? overview.projection.asOf} required /></LiveField>
      <LiveField label={kind === "purchase" ? "Goal to explore using if needed" : "Savings goal"}><select name="goal" required={kind === "extra_contribution"}><option value="">{kind === "purchase" ? "Do not use a goal" : "Choose a goal"}</option>{overview.plan.goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></LiveField>
      {kind === "extra_contribution" && <LiveField label="Contribution frequency"><select name="cadence"><option value="once">Once</option><option value="weekly">Every week</option></select></LiveField>}
    </div><button className="live-primary" type="submit">{busy ? "Comparing…" : "Compare with current plan"}</button></fieldset></form>
    {error && <p className="live-error" role="alert">{error}</p>}
    {comparison && <div className="live-preview"><h3>{comparison.status.replaceAll("_", " ")}</h3><p>Funding: {formatMoney(comparison.funding.discretionaryCents)} discretionary, {formatMoney(comparison.funding.unallocatedCents)} unallocated cash, {formatMoney(comparison.funding.goalCents)} from the selected goal.</p>
      <div className="live-goals">{comparison.goalImpacts.map(impact => <article key={impact.goalId}><h3>{overview.plan.goals.find(goal => goal.id === impact.goalId)?.name ?? "Goal"}</h3><p>{displayDate(impact.originalDate)} → {displayDate(impact.revisedDate)}</p><strong>{impact.delayDays === null ? "Change unavailable" : impact.delayDays === 0 ? "No delay" : impact.delayDays > 0 ? `${impact.delayDays} days later` : `${Math.abs(impact.delayDays)} days earlier`}</strong>{impact.nextWeekExtraCents !== null && <p>Extra needed next week: {formatMoney(impact.nextWeekExtraCents)}. {affordability(impact.nextWeekAffordable)}.</p>}{impact.remainingWeeklyExtraCents !== null && <p>Extra per remaining week: {formatMoney(impact.remainingWeeklyExtraCents)}. {affordability(impact.remainingWeeklyAffordable)}.</p>}</article>)}</div>
      {comparison.after ? <ProjectionSummary projection={comparison.after} /> : <><p>Resolve the current plan’s warnings before comparing this change.</p><ProjectionSummary projection={comparison.before} /></>}
      <details><summary>Comparison assumptions</summary><ul>{comparison.assumptions.map((item, i) => <li key={i}>{item}</li>)}</ul></details>
      {canApply && <button className="live-primary" type="button" disabled={disabled || busy} onClick={() => onSave(result.request)}>Save this change to my plan</button>}
    </div>}
  </section>;
}
