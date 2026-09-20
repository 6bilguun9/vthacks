import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { canonicalJson, scenarioSchema, type Actor, type ScenarioComparison, type ScenarioRequest } from "../domain/model.js";

const integer = z.number().int().safe();
const projectionSchema = z.object({ asOf: z.string().date(), horizonEnd: z.string().date(), feasibility: z.enum(["feasible", "infeasible", "needs_information"]), minimumUnallocatedCashCents: integer.nullable(), goals: z.array(z.object({ goalId: z.string().min(1).max(128), completionDate: z.string().date().nullable(), requiredWeeklyCents: integer.nullable() }).strict()).max(20), assumptions: z.array(z.string().max(500)).max(30), warnings: z.array(z.string().max(500)).max(30) }).strict();
const comparisonSchema = z.object({ scenarioId: z.string().min(1).max(128), snapshotId: z.string().min(1).max(128), planVersion: integer.positive(), status: z.enum(["within_budget", "uses_unallocated_cash", "requires_goal_change", "cash_shortfall", "needs_information", "baseline_infeasible"]), before: projectionSchema, after: projectionSchema.nullable(), funding: z.object({ discretionaryCents: integer.nonnegative(), unallocatedCents: integer.nonnegative(), goalCents: integer.nonnegative() }).strict(), goalImpacts: z.array(z.object({ goalId: z.string().min(1).max(128), originalDate: z.string().date().nullable(), revisedDate: z.string().date().nullable(), delayDays: integer.nullable(), nextWeekExtraCents: integer.nullable(), remainingWeeklyExtraCents: integer.nullable(), nextWeekAffordable: z.boolean().nullable(), remainingWeeklyAffordable: z.boolean().nullable() }).strict()).max(20), assumptions: z.array(z.string().max(500)).max(30) }).strict();
export class PlannerUnavailableError extends Error {}

export function bodyHash(body: unknown): string { return createHash("sha256").update(canonicalJson(body)).digest("hex"); }
export function signature(secret: string, method: string, path: string, audience: string, body: unknown, timestamp: string, nonce: string): string {
  return createHmac("sha256", secret).update(canonicalJson({ method, path, audience, bodyHash: bodyHash(body), timestamp, nonce })).digest("hex");
}
function equal(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function verifySignature(secret: string, method: string, path: string, audience: string, body: unknown, timestamp: string, nonce: string, supplied: string): boolean {
  return equal(signature(secret, method, path, audience, body, timestamp, nonce), supplied);
}

export async function callPlanner(input: { endpoint: URL; audience: string; secret: string; actor: Actor; request: ScenarioRequest; fetch?: typeof fetch; now?: () => Date }): Promise<ScenarioComparison> {
  const expected = `https://${input.audience}/api/v1/agents/planner`;
  if (input.endpoint.href !== expected) throw new PlannerUnavailableError("Resolved endpoint does not match the configured planner.");
  const body = input.request;
  const timestamp = (input.now ?? (() => new Date()))().toISOString(); const nonce = randomUUID();
  const sig = signature(input.secret, "POST", "/api/v1/agents/planner", input.audience, body, timestamp, nonce);
  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(input.endpoint, { method: "POST", redirect: "error", headers: { authorization: `Bearer ${input.actor.token}`, "content-type": "application/json", "x-agent-audience": input.audience, "x-agent-timestamp": timestamp, "x-agent-nonce": nonce, "x-agent-signature": sig }, body: canonicalJson(body), signal: AbortSignal.timeout(15_000) });
  } catch { throw new PlannerUnavailableError("Planner could not be reached."); }
  if (!response.ok || response.redirected) throw new PlannerUnavailableError("Planner did not return a usable response.");
  const parsed = comparisonSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new PlannerUnavailableError("Planner returned an invalid result.");
  if (parsed.data.snapshotId !== input.request.snapshotId || parsed.data.planVersion !== input.request.planVersion) throw new PlannerUnavailableError("Planner result does not match the requested state.");
  return parsed.data;
}

export async function verifyPlannerInvocation(input: { actor: Actor; headers: Record<string, string | undefined>; body: unknown; secret: string; audience: string; consumeNonce: (nonce: string, expiresAt: Date) => Promise<boolean>; now?: () => Date }): Promise<ScenarioRequest> {
  const body = scenarioSchema.safeParse(input.body);
  if (!body.success) throw new PlannerUnavailableError("Invalid planner request.");
  const authorization = input.headers.authorization;
  if (authorization !== `Bearer ${input.actor.token}`) throw new PlannerUnavailableError("Planner caller is not authorized.");
  const timestamp = input.headers["x-agent-timestamp"]; const nonce = input.headers["x-agent-nonce"]; const sig = input.headers["x-agent-signature"];
  if (!timestamp || !nonce || !sig || input.headers["x-agent-audience"] !== input.audience) throw new PlannerUnavailableError("Planner signature is incomplete.");
  const date = new Date(timestamp); const now = (input.now ?? (() => new Date()))();
  if (Number.isNaN(date.valueOf()) || Math.abs(now.valueOf() - date.valueOf()) > 60_000) throw new PlannerUnavailableError("Planner signature has expired.");
  if (!verifySignature(input.secret, "POST", "/api/v1/agents/planner", input.audience, input.body, timestamp, nonce, sig)) throw new PlannerUnavailableError("Planner signature is invalid.");
  if (!await input.consumeNonce(nonce, new Date(date.valueOf() + 60_000))) throw new PlannerUnavailableError("Planner nonce was already used.");
  return body.data;
}
