import { z } from "zod";

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("student-finance-api"),
  apiVersion: z.literal("v1"),
}).strict();

export type HealthResponse = z.infer<typeof healthSchema>;

export class ApiError extends Error {
  constructor(message: string, public readonly code: "configuration" | "network" | "http" | "invalid_response") {
    super(message);
    this.name = "ApiError";
  }
}

export function apiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001") {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error("Invalid API origin");
    }
    return url.origin;
  } catch {
    throw new ApiError("Set NEXT_PUBLIC_API_BASE_URL to the backend HTTP(S) origin.", "configuration");
  }
}

export async function getHealth(options: { baseUrl?: string; signal?: AbortSignal } = {}): Promise<HealthResponse> {
  const baseUrl = apiBaseUrl(options.baseUrl);
  const timeout = AbortSignal.timeout(5000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/v1/health`, { cache: "no-store", signal });
  } catch {
    throw new ApiError("Could not reach the backend. Check that it is running and allows this frontend origin.", "network");
  }

  if (!response.ok) {
    throw new ApiError(`The backend returned HTTP ${response.status}.`, "http");
  }

  try {
    return healthSchema.parse(await response.json());
  } catch {
    throw new ApiError("The backend response does not match the v1 health contract.", "invalid_response");
  }
}

export const diningPlanRequestSchema = z.object({
  diningPlan: z.enum(["Unlimited", "Unlimited Plus", "Maroon", "Maroon Plus", "Orange", "Orange Plus", "Dining Dollars only"]),
  studentStatus: z.enum(["First-year, on campus", "Upper-year, on campus", "Off campus"]),
  diningBalanceCents: z.number().int().nonnegative(), hokiePassportBalanceCents: z.number().int().nonnegative(),
  weeksRemaining: z.number().int().min(1).max(36), preferences: z.string().min(3).max(2000), allowHokiePassport: z.boolean(),
});
const mealSchema = z.object({ label: z.enum(["Breakfast", "Lunch", "Dinner"]), venue: z.string(), suggestion: z.string(), payment: z.enum(["swipe", "meal_exchange", "dining_balance", "hokie_passport", "other"]), estimatedCostCents: z.number().int().nonnegative() });
export const diningPlanResponseSchema = z.object({
  strategy: z.string(), days: z.array(z.object({ day: z.string(), meals: z.array(mealSchema).length(3) })).length(7),
  weeklyDiningSpendCents: z.number().int().nonnegative(), projectedDiningSpendCents: z.number().int().nonnegative(), remainingDiningBalanceCents: z.number().int(),
  assumptions: z.array(z.string()), warnings: z.array(z.string()), hoursUrl: z.literal("https://apps.students.vt.edu/hours/#/"), source: z.literal("vt_arc"), model: z.string(),
});
export type DiningPlanRequest = z.infer<typeof diningPlanRequestSchema>;
export type DiningPlanResponse = z.infer<typeof diningPlanResponseSchema>;

export async function createDiningPlan(input: DiningPlanRequest, options: { baseUrl?: string; signal?: AbortSignal } = {}): Promise<DiningPlanResponse> {
  const baseUrl = apiBaseUrl(options.baseUrl);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/dining-plans`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(diningPlanRequestSchema.parse(input)), signal: options.signal });
  } catch { throw new ApiError("Could not reach the dining planner.", "network"); }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new ApiError(body?.error?.message ?? `The backend returned HTTP ${response.status}.`, "http");
  }
  try { return diningPlanResponseSchema.parse(await response.json()); }
  catch { throw new ApiError("The meal plan did not match the v1 contract.", "invalid_response"); }
}
