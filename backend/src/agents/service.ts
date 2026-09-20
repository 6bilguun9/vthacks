import { z } from "zod";
import type { AppConfig } from "../config/env.js";
import { AppError, chatSchema, scenarioSchema, type Actor, type ChatRequest, type ChatResponse, type Plan, type Projection, type ScenarioComparison, type ScenarioRequest, type Snapshot } from "../domain/model.js";
import type { Limits } from "../domain/ports.js";
import { completeWithAi, AiUnavailableError } from "../integrations/ai.js";
import { resolveAgentEndpoint, AnsUnavailableError } from "../integrations/ans.js";
import { callPlanner, PlannerUnavailableError, verifyPlannerInvocation } from "../integrations/planner-client.js";

type RuntimeConfig = AppConfig & { AI_MODE?: "off" | "presenter"; PRESENTER_USER_IDS?: readonly string[] | undefined; AGENT_SIGNING_SECRET?: string | undefined; PLANNER_ALLOW_LOCAL_FALLBACK?: boolean | undefined };
type Overview = { snapshot: Snapshot; plan: Plan; projection: Projection };
type Callbacks = { overview(actor: Actor): Promise<Overview>; planner(actor: Actor, request: ScenarioRequest): Promise<ScenarioComparison> };
const parsedIntent = z.object({ intent: z.enum(["purchase", "extra_contribution", "goal_timing", "recovery", "clarification"]), amountCents: z.number().int().positive().safe().nullable().optional(), date: z.string().date().nullable().optional(), goalId: z.string().trim().min(1).max(128).nullable().optional(), cadence: z.enum(["once", "weekly"]).nullable().optional(), question: z.string().trim().min(1).max(500).nullable().optional() }).strict();
type ParsedIntent = z.infer<typeof parsedIntent>;

function todayInNewYork(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
function parseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* repair below */ }
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new SyntaxError("No JSON object");
}
function missing(intent: ParsedIntent, request: ChatRequest, plan: Plan): string | null {
  if (intent.intent === "purchase" && !intent.amountCents) return "What is the purchase amount in dollars or cents?";
  if (intent.intent === "extra_contribution" && !intent.amountCents) return "How much extra would you like to contribute?";
  if (["purchase", "extra_contribution"].includes(intent.intent) && !intent.date) return "What date should I use for this scenario?";
  if (intent.intent === "extra_contribution" && !intent.cadence) return "Should this extra contribution happen once or every week?";
  if (["extra_contribution", "goal_timing"].includes(intent.intent) && !(intent.goalId ?? request.selectedGoalId) && plan.goals.length !== 1) return "Which savings goal should I use?";
  return null;
}
function goalName(plan: Plan, id: string | null): string { return plan.goals.find((goal) => goal.id === id)?.name ?? "the selected goal"; }
function formatDate(value: string | null): string { return value ?? "not reached within the two-year forecast"; }
function explain(comparison: ScenarioComparison, plan: Plan, goalId: string | null): string {
  if (comparison.status === "within_budget") return "This purchase is covered by the discretionary budget; your savings schedule is unchanged. A neutral alternative is to keep the same budgeted amount for future purchases.";
  const impact = goalId ? comparison.goalImpacts.find((item) => item.goalId === goalId) : comparison.goalImpacts[0];
  if (!impact) return `The planner marked this as ${comparison.status.replaceAll("_", " ")}.`;
  const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const delay = impact.delayDays === 0 ? "no delay" : impact.delayDays === null ? "delay not available" : impact.delayDays < 0 ? `${Math.abs(impact.delayDays)} days earlier` : `${impact.delayDays} days of delay`;
  const core = `${goalName(plan, impact.goalId)}: original completion ${formatDate(impact.originalDate)}; revised completion ${formatDate(impact.revisedDate)}; ${delay}.`;
  const next = impact.nextWeekExtraCents === null ? "" : ` Catch-up next week: ${dollars(impact.nextWeekExtraCents)} (${impact.nextWeekAffordable ? "currently affordable" : "not currently affordable"}).`;
  const remaining = impact.remainingWeeklyExtraCents === null ? "" : ` Spread across the remaining weeks: ${dollars(impact.remainingWeeklyExtraCents)} per week (${impact.remainingWeeklyAffordable ? "currently affordable" : "not currently affordable"}).`;
  return `${core} ${next}${remaining} A neutral alternative is to keep the current schedule and choose a lower purchase amount or a later date.`.trim();
}
function unavailable(text: string): ChatResponse { return { kind: "explanation", text, comparison: null, executionSource: "unavailable" }; }
export function createAgentService(config: RuntimeConfig, limits: Limits, callbacks: Callbacks, options: { fetch?: typeof fetch; now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date());
  async function getIntent(request: ChatRequest, plan: Plan): Promise<ParsedIntent> {
    const deadline = Date.now() + 30_000;
    const aiOptions = () => ({ ...(options.fetch ? { fetch: options.fetch } : {}), timeoutMs: Math.max(1, deadline - Date.now()) });
    const today = todayInNewYork(now());
    const goalContext = plan.goals.map((goal) => ({ id: goal.id, name: goal.name }));
    const system = "Extract only a supported financial intent. Return JSON: intent (purchase|extra_contribution|goal_timing|recovery|clarification), amountCents nullable, date nullable YYYY-MM-DD, goalId nullable, cadence nullable once|weekly, question nullable. A goalId must be one of the supplied goals. Use only an explicit date from the user; if none, leave date null. Do not infer a date from today. This is parsing only; do not give financial advice.";
    const messages = [
      { role: "system" as const, content: system },
      { role: "user" as const, content: `Reference date in America/New_York: ${today}. Available goals: ${JSON.stringify(goalContext)}. User message: ${request.message}` },
    ];
    let raw = await completeWithAi(config, messages, aiOptions());
    let candidate: unknown;
    try { candidate = parseJson(raw); } catch { candidate = null; }
    let result = parsedIntent.safeParse(candidate);
    if (!result.success) {
      if (Date.now() >= deadline) throw new AiUnavailableError("AI parsing exceeded its request budget.");
      raw = await completeWithAi(config, [{ role: "system", content: system }, { role: "user", content: `Repair this into the requested JSON. Validation issues: ${JSON.stringify(result.error.issues.map((issue) => ({ path: issue.path, code: issue.code })))}. Draft: ${raw}` }], aiOptions());
      try { candidate = parseJson(raw); } catch { candidate = null; }
      result = parsedIntent.safeParse(candidate);
    }
    if (!result.success) throw new AiUnavailableError("AI response could not be parsed.");
    return result.data;
  }
  async function chat(actor: Actor, body: ChatRequest): Promise<ChatResponse> {
    const request = chatSchema.parse(body);
      const overview = await callbacks.overview(actor);
      if (overview.snapshot.id !== request.snapshotId || overview.plan.version !== request.planVersion) throw new AppError(409, "STALE_STATE", "The financial snapshot or plan has changed.");
      let intent: ParsedIntent;
      try { intent = await getIntent(request, overview.plan); } catch (error) { if (error instanceof AiUnavailableError) return unavailable("I could not interpret that request. Please use the scenario form."); throw error; }
      if (intent.goalId && !overview.plan.goals.some((goal) => goal.id === intent.goalId)) return { kind: "clarification", text: "I could not match that goal. Please choose one of your saved goals.", comparison: null, executionSource: "unavailable" };
      const clarification = missing(intent, request, overview.plan);
      if (clarification || intent.intent === "clarification" || intent.intent === "recovery") return { kind: "clarification", text: clarification ?? intent.question ?? (intent.intent === "recovery" ? "What purchase amount and date should I use to compare recovery options?" : "Which goal would you like to review?"), comparison: null, executionSource: "unavailable" };
      const goalId = intent.goalId ?? request.selectedGoalId ?? (intent.intent === "purchase" ? null : overview.plan.goals.length === 1 ? overview.plan.goals[0]?.id ?? null : null);
      if (intent.intent === "goal_timing") {
        const goal = overview.projection.goals.find((item) => item.goalId === goalId);
        const weekly = goal?.requiredWeeklyCents === null || goal?.requiredWeeklyCents === undefined ? "not available" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(goal.requiredWeeklyCents / 100);
        const state = overview.projection.feasibility === "infeasible" ? "The current plan is infeasible, so a completion date is not reliable." : overview.projection.feasibility === "needs_information" ? "More financial information is needed before a completion date is reliable." : "";
        return { kind: "explanation", text: goal ? `${state} ${goalName(overview.plan, goalId)} is projected to complete on ${formatDate(goal.completionDate)}. Required weekly contribution: ${weekly}.`.trim() : "I could not find that goal in the current projection.", comparison: null, executionSource: "unavailable" };
      }
      const scenario = scenarioSchema.parse({ snapshotId: request.snapshotId, planVersion: request.planVersion, kind: intent.intent === "purchase" ? "purchase" : "extra_contribution", amountCents: intent.amountCents, date: intent.date, cadence: intent.intent === "purchase" ? "once" : intent.cadence, goalId });
      try {
        if (!config.PLANNER_AGENT_HOST || !config.AGENT_SIGNING_SECRET) throw new PlannerUnavailableError("Remote planner is not configured.");
        const endpoint = await resolveAgentEndpoint({ baseUrl: config.ANS_BASE_URL, apiKey: config.ANS_API_KEY, agentHost: config.PLANNER_AGENT_HOST, version: config.ANS_AGENT_VERSION, ...(options.fetch ? { fetch: options.fetch } : {}) });
        const comparison = await callPlanner({ endpoint, audience: config.PLANNER_AGENT_HOST, secret: config.AGENT_SIGNING_SECRET, actor, request: scenario, ...(options.fetch ? { fetch: options.fetch } : {}), now });
        return { kind: "comparison", text: explain(comparison, overview.plan, goalId), comparison, executionSource: "ans_remote" };
      } catch (error) {
        if (!config.PLANNER_ALLOW_LOCAL_FALLBACK || !(error instanceof AnsUnavailableError || error instanceof PlannerUnavailableError)) return unavailable("The planner is temporarily unavailable.");
        const comparison = await callbacks.planner(actor, scenario);
        return { kind: "comparison", text: explain(comparison, overview.plan, goalId), comparison, executionSource: "local_fallback" };
      }
  }
  async function verifyPlannerRequest(actor: Actor, headers: Record<string, string | undefined>, body: unknown): Promise<void> {
    if (!config.PLANNER_AGENT_HOST || !config.AGENT_SIGNING_SECRET) throw new AppError(503, "PLANNER_UNAVAILABLE", "Planner authentication is not configured.");
    try { await verifyPlannerInvocation({ actor, headers, body, secret: config.AGENT_SIGNING_SECRET, audience: config.PLANNER_AGENT_HOST, consumeNonce: limits.consumeNonce.bind(limits), now }); }
    catch (error) { if (error instanceof PlannerUnavailableError) throw new AppError(401, "INVALID_AGENT_REQUEST", "Planner request could not be verified."); throw error; }
  }
  return { chat, verifyPlannerRequest };
}
