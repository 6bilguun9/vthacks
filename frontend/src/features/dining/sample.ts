import type { DiningPlanResponse } from "@/lib/api";
const meals = (day: string, exchange = false) => ({ day, meals: [
  { label: "Breakfast" as const, venue: day === "Saturday" ? "Owens" : "D2", suggestion: "Quick vegetarian option — confirm today’s menu", payment: "swipe" as const, estimatedCostCents: 0 },
  { label: "Lunch" as const, venue: exchange ? "Perry Place" : "Owens", suggestion: exchange ? "Eligible vegetarian meal exchange — confirm current offer" : "Vegetarian entrée — confirm today’s menu", payment: exchange ? "meal_exchange" as const : "swipe" as const, estimatedCostCents: 0 },
  { label: "Dinner" as const, venue: "D2", suggestion: "Vegetarian entrée — confirm today’s menu", payment: "swipe" as const, estimatedCostCents: 0 },
] });
export const sampleDiningPlan: DiningPlanResponse = {
  strategy: "Use included unlimited swipes for most meals and weekly exchanges for variety. Keep restricted dining dollars available for VT Dining purchases when another location better fits the schedule.",
  days: [meals("Monday", true), meals("Tuesday"), meals("Wednesday", true), meals("Thursday"), meals("Friday", true), meals("Saturday", true), meals("Sunday")],
  weeklyDiningSpendCents: 0, projectedDiningSpendCents: 0, remainingDiningBalanceCents: 22500,
  assumptions: ["This is synthetic sample data.", "Current menus and hours were not fetched."], warnings: ["Verify ingredients and cross-contact directly with Dining Services."],
  hoursUrl: "https://apps.students.vt.edu/hours/#/", source: "vt_arc", model: "sample",
};
