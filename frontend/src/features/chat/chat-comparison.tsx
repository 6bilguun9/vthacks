import type { ScenarioComparison } from "@/lib/api";

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Not established";
const affordability = (value: boolean | null) => value === null ? "Affordability not established" : value ? "Affordable in this projection" : "Not affordable in this projection";

export function ChatComparison({ comparison }: { comparison: ScenarioComparison }) {
  return <details className="fb-comparison">
    <summary>View calculated comparison · not saved</summary>
    <dl className="fb-comparison-funding">
      <div><dt>Discretionary funds</dt><dd>{money(comparison.funding.discretionaryCents)}</dd></div>
      <div><dt>Unallocated bank cash</dt><dd>{money(comparison.funding.unallocatedCents)}</dd></div>
      <div><dt>Goal funds</dt><dd>{money(comparison.funding.goalCents)}</dd></div>
    </dl>
    <p>Result: {comparison.status.replaceAll("_", " ")}. Based on saved plan version {comparison.planVersion}; later edits may change this result.</p>
    {comparison.goalImpacts.map((impact, index) => <section key={impact.goalId} className="fb-goal-impact" aria-label={`Goal impact ${index + 1}`}>
      <p><strong>Goal date:</strong> {date(impact.originalDate)} → {date(impact.revisedDate)}</p>
      <p>{impact.delayDays === null ? "Delay cannot be established from the available data." : `${impact.delayDays} day change.`}</p>
      {impact.nextWeekExtraCents !== null && <p>Extra next week: {money(impact.nextWeekExtraCents)}. {affordability(impact.nextWeekAffordable)}.</p>}
      {impact.remainingWeeklyExtraCents !== null && <p>Extra each remaining week: {money(impact.remainingWeeklyExtraCents)}. {affordability(impact.remainingWeeklyAffordable)}.</p>}
    </section>)}
    {[...comparison.assumptions, ...(comparison.after?.warnings ?? [])].length > 0 && <ul>{[...comparison.assumptions, ...(comparison.after?.warnings ?? [])].map((note, index) => <li key={index}>{note}</li>)}</ul>}
    <p>No purchase, transfer, or plan change was made. Review any proposed changes in your plan before saving.</p>
  </details>;
}
