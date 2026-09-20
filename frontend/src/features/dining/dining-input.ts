import { diningPlanRequestSchema, type DiningPlanRequest } from "../../lib/api";

function cents(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new Error("Enter balances as nonnegative dollars with at most two decimal places.");
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error("That balance is too large. Check the amount.");
  return amount;
}

export function diningInput(data: FormData): DiningPlanRequest {
  const parsed = diningPlanRequestSchema.safeParse({
    diningPlan: data.get("diningPlan"), studentStatus: data.get("studentStatus"),
    diningBalanceCents: cents(data.get("diningBalance")), hokiePassportBalanceCents: cents(data.get("hokiePassportBalance")),
    weeksRemaining: Number(data.get("weeksRemaining")), preferences: String(data.get("preferences") ?? "").trim(),
    allowHokiePassport: data.get("allowHokiePassport") === "on",
  });
  if (!parsed.success) throw new Error("Choose your dining plan and student status, enter 1–36 weeks, and add at least three characters about your preferences.");
  return parsed.data;
}
