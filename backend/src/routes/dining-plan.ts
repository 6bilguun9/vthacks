import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config/env.js";
import { DINING_SYSTEM_PROMPT } from "../agents/dining-prompt.js";
import { AiUnavailableError, completeWithAi, getAiProvider } from "../integrations/ai.js";
import { diningMealLabelSchema, normalizeDiningResult } from "../agents/dining.js";
import type { FinancialRouteOptions } from "./financial.js";

const requestSchema = z.object({
  diningPlan: z.enum(["Unlimited", "Unlimited Plus", "Maroon", "Maroon Plus", "Orange", "Orange Plus", "Dining Dollars only"]),
  studentStatus: z.enum(["First-year, on campus", "Upper-year, on campus", "Off campus"]),
  diningBalanceCents: z.number().int().nonnegative().safe(),
  hokiePassportBalanceCents: z.number().int().nonnegative().safe(),
  weeksRemaining: z.number().int().min(1).max(36),
  preferences: z.string().trim().min(3).max(2000),
  allowHokiePassport: z.boolean().default(false),
}).strict();

const paymentSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.toLowerCase().replaceAll(/[^a-z]+/g, "_");
  if (normalized.includes("exchange")) return "meal_exchange";
  if (normalized.includes("swipe") || normalized.includes("unlimited")) return "swipe";
  if (normalized.includes("hokie") || normalized.includes("passport")) return "hokie_passport";
  if (normalized.includes("dining") || normalized.includes("dbd") || normalized.includes("declining")) return "dining_balance";
  return "other";
}, z.enum(["swipe", "meal_exchange", "dining_balance", "hokie_passport", "other"]));
const notesSchema = z.preprocess((value) => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.slice(0, 10);
  return value;
}, z.array(z.string().max(500)).max(10));
const mealSchema = z.object({ label: diningMealLabelSchema, venue: z.string().min(1).max(100), suggestion: z.string().min(1).max(240), payment: paymentSchema, estimatedCostCents: z.number().int().nonnegative().safe() }).strict();
const responseSchema = z.object({
  strategy: z.string().min(1).max(2000),
  days: z.array(z.object({ day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]), meals: z.array(mealSchema).length(3) }).strict()).length(7),
  weeklyDiningSpendCents: z.number().int().nonnegative().safe(),
  projectedDiningSpendCents: z.number().int().nonnegative().safe(),
  remainingDiningBalanceCents: z.number().int().safe(),
  assumptions: notesSchema, warnings: notesSchema,
  hoursUrl: z.literal("https://apps.students.vt.edu/hours/#/"), source: z.enum(["vt_arc", "openrouter"]), model: z.string().min(1),
}).strict();

export type DiningPlanResponse = z.infer<typeof responseSchema>;

function parseJsonObject(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* Some reasoning models can prefix their JSON. */ }
  const end = raw.lastIndexOf("}");
  for (let start = raw.indexOf("{"); start >= 0 && start < end; start = raw.indexOf("{", start + 1)) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* Try the next object boundary. */ }
  }
  throw new SyntaxError("No JSON object found in AI provider response");
}

export const diningPlanRoutes: FastifyPluginAsync<{ config: AppConfig; complete?: typeof completeWithAi; fetch?: typeof fetch } & Pick<FinancialRouteOptions, "auth" | "limits" | "clock" | "requireAi">> = async (app, options) => {
  app.post("/dining-plans", async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: { code: "INVALID_REQUEST", message: "Check the dining-plan fields and try again." } });
    const input = parsed.data;
    const actor = await options.auth.authenticate(request.headers.authorization, request.ip);
    options.requireAi(actor);
    const release = await options.limits.acquire(actor, "ai", options.clock());
    const deadline = Date.now() + 55_000;
    const provider = getAiProvider(options.config);
    const prompt = `Create a representative weekly plan for this student. Return JSON with strategy; days; weeklyDiningSpendCents; projectedDiningSpendCents; remainingDiningBalanceCents; assumptions; warnings; hoursUrl; source; model. Each day has day and three meals; each meal has label, venue, suggestion, payment, estimatedCostCents. The payment value must be exactly one of: swipe, meal_exchange, dining_balance, hokie_passport, other.\n\n${JSON.stringify(input)}\n\nThe active AI model is ${provider.model}. Set source to ${provider.source} and model to that exact value. Current balances, not original plan values, control the budget.`;
    try {
      const complete = options.complete ?? completeWithAi;
      const completionOptions = () => ({ timeoutMs: Math.max(1, deadline - Date.now()), maxTokens: 5000, ...(options.fetch ? { fetch: options.fetch } : {}) });
      const raw = await complete(options.config, [{ role: "system", content: DINING_SYSTEM_PROMPT }, { role: "user", content: prompt }], completionOptions());
      let draft: unknown;
      try { draft = parseJsonObject(raw); } catch { draft = null; }
      let result = responseSchema.safeParse(draft);
      if (!result.success) {
        const issues = result.error.issues.map(({ path, code }) => ({ path: path.join("."), code }));
        request.log.warn({ issues }, "AI dining response failed validation; requesting one repair");
        const repaired = await complete(options.config, [
          { role: "system", content: DINING_SYSTEM_PROMPT },
          { role: "user", content: `Repair this invalid draft into the exact requested JSON shape. Return only the corrected JSON object. Validation issues: ${JSON.stringify(issues)}\n\nInvalid draft:\n${raw}` },
        ], completionOptions());
        result = responseSchema.safeParse(parseJsonObject(repaired));
      }
      if (!result.success) return reply.code(502).send({ error: { code: "INVALID_PROVIDER_RESPONSE", message: "The AI provider returned a meal plan that could not be safely validated." } });
      return reply.header("Cache-Control", "no-store").send(normalizeDiningResult(input, { ...result.data, source: provider.source, model: provider.model }));
    } catch (error) {
      if (error instanceof AiUnavailableError) {
        request.log.warn({ provider: provider.provider, reason: error.message }, "AI dining provider unavailable");
        return reply.code(503).send({ error: { code: "AI_UNAVAILABLE", message: "The meal-planning agent is temporarily unavailable." } });
      }
      request.log.warn("AI dining response was invalid");
      return reply.code(502).send({ error: { code: "INVALID_PROVIDER_RESPONSE", message: "The AI provider returned a meal plan that could not be safely validated." } });
    } finally { await release(); }
  });
};
