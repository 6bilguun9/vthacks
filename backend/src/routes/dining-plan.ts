import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config/env.js";
import { DINING_SYSTEM_PROMPT } from "../agents/dining-prompt.js";
import { ArcUnavailableError, completeWithArc } from "../integrations/arc.js";

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
const mealSchema = z.object({ label: z.enum(["Breakfast", "Lunch", "Dinner"]), venue: z.string().min(1).max(100), suggestion: z.string().min(1).max(240), payment: paymentSchema, estimatedCostCents: z.number().int().nonnegative().safe() }).strict();
const responseSchema = z.object({
  strategy: z.string().min(1).max(2000),
  days: z.array(z.object({ day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]), meals: z.array(mealSchema).length(3) }).strict()).length(7),
  weeklyDiningSpendCents: z.number().int().nonnegative().safe(),
  projectedDiningSpendCents: z.number().int().nonnegative().safe(),
  remainingDiningBalanceCents: z.number().int().safe(),
  assumptions: notesSchema, warnings: notesSchema,
  hoursUrl: z.literal("https://apps.students.vt.edu/hours/#/"), source: z.literal("vt_arc"), model: z.string().min(1),
}).strict();

export type DiningPlanResponse = z.infer<typeof responseSchema>;

function parseJsonObject(raw: string): unknown {
  try { return JSON.parse(raw); } catch { /* ARC reasoning models can prefix their JSON. */ }
  const end = raw.lastIndexOf("}");
  for (let start = raw.indexOf("{"); start >= 0 && start < end; start = raw.indexOf("{", start + 1)) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch { /* Try the next object boundary. */ }
  }
  throw new SyntaxError("No JSON object found in ARC response");
}

export const diningPlanRoutes: FastifyPluginAsync<{ config: AppConfig; complete?: typeof completeWithArc }> = async (app, options) => {
  app.post("/dining-plans", async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(422).send({ error: { code: "INVALID_REQUEST", message: "Check the dining-plan fields and try again." } });
    const input = parsed.data;
    const prompt = `Create a representative weekly plan for this student. Return JSON with strategy; days; weeklyDiningSpendCents; projectedDiningSpendCents; remainingDiningBalanceCents; assumptions; warnings; hoursUrl; source; model. Each day has day and three meals; each meal has label, venue, suggestion, payment, estimatedCostCents. The payment value must be exactly one of: swipe, meal_exchange, dining_balance, hokie_passport, other.\n\n${JSON.stringify(input)}\n\nThe active ARC model is ${options.config.ARC_MODEL}. Set source to vt_arc and model to that exact value. Current balances, not original plan values, control the budget.`;
    try {
      const complete = options.complete ?? completeWithArc;
      const raw = await complete(options.config, [{ role: "system", content: DINING_SYSTEM_PROMPT }, { role: "user", content: prompt }]);
      let result = responseSchema.safeParse(parseJsonObject(raw));
      if (!result.success) {
        const issues = result.error.issues.map(({ path, code }) => ({ path: path.join("."), code }));
        request.log.warn({ issues }, "ARC dining response failed validation; requesting one repair");
        const repaired = await complete(options.config, [
          { role: "system", content: DINING_SYSTEM_PROMPT },
          { role: "user", content: `Repair this invalid draft into the exact requested JSON shape. Return only the corrected JSON object. Validation issues: ${JSON.stringify(issues)}\n\nInvalid draft:\n${raw}` },
        ]);
        result = responseSchema.safeParse(parseJsonObject(repaired));
      }
      if (!result.success) return reply.code(502).send({ error: { code: "INVALID_PROVIDER_RESPONSE", message: "ARC returned a meal plan that could not be safely validated." } });
      return reply.header("Cache-Control", "no-store").send(result.data);
    } catch (error) {
      if (error instanceof ArcUnavailableError) return reply.code(503).send({ error: { code: "ARC_UNAVAILABLE", message: "The meal-planning agent is temporarily unavailable." } });
      request.log.warn("ARC dining response was invalid");
      return reply.code(502).send({ error: { code: "INVALID_PROVIDER_RESPONSE", message: "ARC returned a meal plan that could not be safely validated." } });
    }
  });
};
