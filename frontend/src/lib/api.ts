import { z } from "zod";
import {
  chatRequestSchema, chatResponseSchema, commitRequestSchema, financialSnapshotSchema,
  manualRequestSchema, overviewResponseSchema, ownedStateSchema, planPreviewRequestSchema,
  planPreviewResponseSchema, planSchema, scenarioComparisonSchema, scenarioRequestSchema,
  type ChatRequest, type CommitRequest, type ManualRequest, type PlanPreviewRequest, type ScenarioRequest,
} from "./finance-contracts";

export * from "./finance-contracts";

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("student-finance-api"),
  apiVersion: z.literal("v1"),
}).strict();

export type HealthResponse = z.infer<typeof healthSchema>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: "configuration" | "network" | "http" | "invalid_response" | "invalid_request" | "aborted",
    public readonly status?: number,
    public readonly backendCode?: string,
  ) {
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
  diningBalanceCents: z.number().int().nonnegative().safe(), hokiePassportBalanceCents: z.number().int().nonnegative().safe(),
  weeksRemaining: z.number().int().min(1).max(36), preferences: z.string().trim().min(3).max(2000), allowHokiePassport: z.boolean(),
}).strict();
const mealSchema = z.object({ label: z.enum(["Breakfast", "Lunch", "Dinner"]), venue: z.string(), suggestion: z.string(), payment: z.enum(["swipe", "meal_exchange", "dining_balance", "hokie_passport", "other"]), estimatedCostCents: z.number().int().nonnegative().safe() }).strict();
export const diningPlanResponseSchema = z.object({
  strategy: z.string(), days: z.array(z.object({ day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]), meals: z.array(mealSchema).length(3) }).strict()).length(7),
  weeklyDiningSpendCents: z.number().int().nonnegative().safe(), projectedDiningSpendCents: z.number().int().nonnegative().safe(), remainingDiningBalanceCents: z.number().int().safe(),
  assumptions: z.array(z.string()), warnings: z.array(z.string()), hoursUrl: z.literal("https://apps.students.vt.edu/hours/#/"), source: z.enum(["vt_arc", "openrouter"]), model: z.string(),
}).strict();
export type DiningPlanRequest = z.infer<typeof diningPlanRequestSchema>;
export type DiningPlanResponse = z.infer<typeof diningPlanResponseSchema>;

export interface ApiOptions { accessToken: string; baseUrl?: string; signal?: AbortSignal }

const errorBodySchema = z.object({ error: z.object({ code: z.string().regex(/^[A-Z_]{1,64}$/) }) });
const safeMessages: Record<string, string> = {
  UNAUTHORIZED: "Your guest session has expired. Reconnect to continue.",
  FORBIDDEN: "This session cannot access that saved information.",
  PRESENTER_REQUIRED: "AI features are available to the authorized demo presenter. Plan previews remain available.",
  STATE_NOT_FOUND: "This guest session does not have a saved plan yet.",
  STALE_PLAN: "Your plan changed. Reload it and preview this change again before saving.",
  STALE_STATE: "Your plan changed. Reload it and preview this change again before saving.",
  IDEMPOTENCY_CONFLICT: "This save identifier belongs to a different change. Reload your plan before trying again.",
  RATE_LIMITED: "Please wait before trying again.",
  AI_DISABLED: "AI features are not enabled. Plan previews remain available.",
  AI_UNAVAILABLE: "The AI service is temporarily unavailable. Please try again later.",
  STORAGE_UNAVAILABLE: "Saved plans are temporarily unavailable. Please try again later.",
  NESSIE_UNAVAILABLE: "A Nessie sandbox customer has not been configured. Your saved snapshot is unchanged.",
  NESSIE_PROVIDER_ERROR: "Nessie could not be refreshed. Your previous saved snapshot is unchanged.",
  INVALID_PROVIDER_RESPONSE: "The AI response could not be safely validated. Please try again later.",
  INVALID_REQUEST: "Check the input amounts, dates, and selected records.",
  INVALID_PLAN: "Check your goal references, dates, and amounts. Goals used by saved purchases or extra contributions must remain in the plan.",
  SCENARIO_NOT_APPLICABLE: "Resolve the comparison's missing information or funding shortfall before saving.",
};

function validateInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError("Check the input amounts, dates, and selected records.", "invalid_request");
  return result.data;
}

function interrupted(signal: AbortSignal, timeout: AbortSignal): ApiError {
  if (timeout.aborted) return new ApiError("The request took too long. Reload your plan to check its latest saved state before trying again.", "network");
  if (signal.aborted) return new ApiError("The request was canceled.", "aborted");
  return new ApiError("Could not reach the service. Check your connection and try again.", "network");
}

async function authenticatedRequest<T>(
  path: string, schema: z.ZodType<T>, options: ApiOptions,
  request: { body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const token = options?.accessToken?.trim();
  if (!token || /\s/.test(token)) throw new ApiError("Start a guest session before using connected features.", "configuration");
  const baseUrl = apiBaseUrl(options.baseUrl);
  const timeout = AbortSignal.timeout(request.timeoutMs ?? 15_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  if (signal.aborted) throw interrupted(signal, timeout);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1${path}`, {
      method: request.body === undefined ? "GET" : "POST", cache: "no-store", signal,
      headers: { authorization: `Bearer ${token}`, ...(request.body === undefined ? {} : { "content-type": "application/json" }) },
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    });
  } catch { throw interrupted(signal, timeout); }
  if (!response.ok) {
    const parsed = errorBodySchema.safeParse(await response.json().catch(() => null));
    const backendCode = parsed.success ? parsed.data.error.code : undefined;
    const fallback = response.status === 401 ? safeMessages.UNAUTHORIZED
      : response.status === 403 ? safeMessages.FORBIDDEN
      : response.status === 409 ? safeMessages.STALE_PLAN
      : response.status === 429 ? safeMessages.RATE_LIMITED
      : `The service could not complete this request (HTTP ${response.status}).`;
    throw new ApiError((backendCode && safeMessages[backendCode]) || fallback || "The service could not complete this request.", "http", response.status, backendCode);
  }
  try { return schema.parse(await response.json()); }
  catch {
    if (signal.aborted) throw interrupted(signal, timeout);
    throw new ApiError("The service returned information that did not match the v1 contract.", "invalid_response");
  }
}

export function getOverview(options: ApiOptions) {
  return authenticatedRequest("/overview", overviewResponseSchema, options);
}
export function bootstrapSession(options: ApiOptions) {
  return authenticatedRequest("/session/bootstrap", overviewResponseSchema, options, { body: { source: "fixture" } });
}
export function refreshBankData(options: ApiOptions) {
  return authenticatedRequest("/data/refresh", financialSnapshotSchema, options, { body: {}, timeoutMs: 40_000 });
}
export async function updateManualData(input: ManualRequest, options: ApiOptions) {
  return authenticatedRequest("/data/manual", ownedStateSchema, options, { body: validateInput(manualRequestSchema, input) });
}
export async function previewPlan(input: PlanPreviewRequest, options: ApiOptions) {
  return authenticatedRequest("/plan/preview", planPreviewResponseSchema, options, { body: validateInput(planPreviewRequestSchema, input) });
}
export async function compareScenario(input: ScenarioRequest, options: ApiOptions) {
  return authenticatedRequest("/scenarios", scenarioComparisonSchema, options, { body: validateInput(scenarioRequestSchema, input) });
}
export async function commitPlan(input: CommitRequest, options: ApiOptions) {
  return authenticatedRequest("/plan/commit", planSchema, options, { body: validateInput(commitRequestSchema, input) });
}
export async function sendChat(input: ChatRequest, options: ApiOptions) {
  return authenticatedRequest("/chat", chatResponseSchema, options, { body: validateInput(chatRequestSchema, input), timeoutMs: 60_000 });
}
export async function createDiningPlan(input: DiningPlanRequest, options: ApiOptions): Promise<DiningPlanResponse> {
  return authenticatedRequest("/dining-plans", diningPlanResponseSchema, options, { body: validateInput(diningPlanRequestSchema, input), timeoutMs: 105_000 });
}
