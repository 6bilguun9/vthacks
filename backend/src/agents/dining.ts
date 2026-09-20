import { z } from "zod";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const labels = ["Breakfast", "Lunch", "Dinner"] as const;
const payment = z.enum(["swipe", "meal_exchange", "dining_balance", "hokie_passport", "other"]);
const meal = z.object({ label: z.enum(labels), venue: z.string().min(1).max(100), suggestion: z.string().min(1).max(240), payment, estimatedCostCents: z.number().int().nonnegative().safe() }).strict();
const draftSchema = z.object({
  strategy: z.string().min(1).max(2000),
  days: z.array(z.object({ day: z.enum(days), meals: z.array(meal).length(3) }).strict()).length(7),
  weeklyDiningSpendCents: z.number().int().nonnegative().safe().optional(), projectedDiningSpendCents: z.number().int().nonnegative().safe().optional(), remainingDiningBalanceCents: z.number().int().safe().optional(),
  assumptions: z.array(z.string().max(500)).max(10), warnings: z.array(z.string().max(500)).max(10),
  hoursUrl: z.literal("https://apps.students.vt.edu/hours/#/"), source: z.literal("vt_arc"), model: z.string().min(1),
}).strict();
export type DiningPlanResponse = z.infer<typeof draftSchema> & { weeklyDiningSpendCents: number; projectedDiningSpendCents: number; remainingDiningBalanceCents: number };

/** Recomputes money from meals; model-provided totals are never trusted. */
export function normalizeDiningResult(input: { diningBalanceCents: number; hokiePassportBalanceCents: number; weeksRemaining: number; allowHokiePassport: boolean; diningPlan: string }, raw: unknown): DiningPlanResponse {
  const parsed = draftSchema.parse(raw);
  const seenDays = new Set<string>();
  let diningWeekly = 0;
  let hokieWeekly = 0;
  let outsideCashWeekly = 0;
  for (const day of parsed.days) {
    if (seenDays.has(day.day)) throw new RangeError("Each weekday must appear once.");
    seenDays.add(day.day);
    const seenMeals = new Set<string>();
    for (const item of day.meals) {
      if (seenMeals.has(item.label)) throw new RangeError("Each day must have one breakfast, lunch, and dinner.");
      seenMeals.add(item.label);
      if (item.payment === "hokie_passport" && !input.allowHokiePassport) throw new RangeError("Hokie Passport is not permitted.");
      if (["swipe", "meal_exchange"].includes(item.payment) && input.diningPlan === "Dining Dollars only") throw new RangeError("This plan does not include meal swipes or exchanges.");
      if (item.payment === "dining_balance") diningWeekly += item.estimatedCostCents;
      if (item.payment === "hokie_passport") hokieWeekly += item.estimatedCostCents;
      if (item.payment === "other") outsideCashWeekly += item.estimatedCostCents;
    }
    if (seenMeals.size !== labels.length) throw new RangeError("Each day must have three distinct meals.");
  }
  if (seenDays.size !== days.length) throw new RangeError("The plan must cover Monday through Sunday.");
  const projected = diningWeekly * input.weeksRemaining;
  const projectedHokie = hokieWeekly * input.weeksRemaining;
  if (!Number.isSafeInteger(projected) || projected > input.diningBalanceCents) throw new RangeError("Dining balance cannot cover the proposed plan.");
  if (!Number.isSafeInteger(projectedHokie) || projectedHokie > input.hokiePassportBalanceCents) throw new RangeError("Hokie Passport balance cannot cover the proposed plan.");
  if (!Number.isSafeInteger(outsideCashWeekly)) throw new RangeError("Outside cash exceeds the supported money range.");
  const warnings = ["All listed meal costs are estimates; confirm current prices and availability."];
  if (outsideCashWeekly > 0) warnings.push(`Other payment methods are estimated outside cash: ${outsideCashWeekly} cents per week.`);
  return { ...parsed, warnings: [...warnings, ...parsed.warnings].slice(0, 10), weeklyDiningSpendCents: diningWeekly, projectedDiningSpendCents: projected, remainingDiningBalanceCents: input.diningBalanceCents - projected };
}
