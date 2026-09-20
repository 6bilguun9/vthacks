import scenario from "./scenario-goal-delay.json";

// A checked-in synthetic contract response, not a live request or frontend calculation.
// Keep this independent Laptop profile separate from the dashboard Emergency fund.
export const backendExample = {
  purchaseCents: 15000,
  goalName: "Laptop",
  response: scenario,
  impact: scenario.goalImpacts[0]!,
} as const;

export function presentationDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
