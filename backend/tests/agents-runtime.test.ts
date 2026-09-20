import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalJson, type Actor, type ScenarioComparison, type ScenarioRequest } from "../src/domain/model.js";
import { signature, verifyPlannerInvocation } from "../src/integrations/planner-client.js";
import { createAgentService } from "../src/agents/service.js";
import { normalizeDiningResult } from "../src/agents/dining.js";
import { readConfig } from "../src/config/env.js";

const actor: Actor = { userId: "guest-1", token: "user-token", ip: "127.0.0.1" };
const request: ScenarioRequest = { snapshotId: "snapshot-1", planVersion: 1, kind: "purchase", amountCents: 2500, date: "2026-09-19", cadence: "once", goalId: "goal-1" };
const secret = "01234567890123456789012345678901";

describe("planner request verification", () => {
  it("accepts a signed direct ScenarioRequest once", async () => {
    const timestamp = "2026-09-19T12:00:00.000Z"; const nonce = "nonce-1";
    const headers = { authorization: "Bearer user-token", "x-agent-audience": "planner.example.com", "x-agent-timestamp": timestamp, "x-agent-nonce": nonce, "x-agent-signature": signature(secret, "POST", "/api/v1/agents/planner", "planner.example.com", request, timestamp, nonce) };
    const received = await verifyPlannerInvocation({ actor, headers, body: request, secret, audience: "planner.example.com", now: () => new Date(timestamp), consumeNonce: async () => true });
    expect(canonicalJson(received)).toBe(canonicalJson(request));
  });

  it("rejects replayed or altered requests", async () => {
    const timestamp = "2026-09-19T12:00:00.000Z"; const nonce = "nonce-2";
    const headers = { authorization: "Bearer user-token", "x-agent-audience": "planner.example.com", "x-agent-timestamp": timestamp, "x-agent-nonce": nonce, "x-agent-signature": signature(secret, "POST", "/api/v1/agents/planner", "planner.example.com", request, timestamp, nonce) };
    await expect(verifyPlannerInvocation({ actor, headers, body: request, secret, audience: "planner.example.com", now: () => new Date(timestamp), consumeNonce: async () => false })).rejects.toThrow("already used");
    await expect(verifyPlannerInvocation({ actor, headers, body: { ...request, amountCents: 2501 }, secret, audience: "planner.example.com", now: () => new Date(timestamp), consumeNonce: async () => true })).rejects.toThrow("invalid");
  });
});

const plan = { id: "plan", version: 1, goals: [{ id: "goal-1", name: "Tuition" }, { id: "goal-2", name: "Laptop" }] } as never;
const snapshot = { id: "snapshot-1" } as never;
const projection = { goals: [{ goalId: "goal-1", completionDate: "2026-12-01", requiredWeeklyCents: 1250 }] } as never;
const limits = { acquire: async () => async () => {}, consumeNonce: async () => true };
function serviceWithReplies(replies: string[]) {
  const fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: replies.shift() ?? "{}" } }] }));
  return createAgentService(readConfig({ ARC_API_KEY: "key", LOG_LEVEL: "silent" }), limits, { overview: async () => ({ snapshot, plan, projection }), planner: async () => { throw new Error("not expected"); } }, { fetch, now: () => new Date("2026-09-19T12:00:00Z") });
}

describe("coach parsing and dining normalization", () => {
  it("recomputes dining totals and keeps estimate/outside-cash warnings even with ten model warnings", () => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({ day, meals: ["Breakfast", "Lunch", "Dinner"].map((label) => ({ label, venue: "Place", suggestion: "Estimated option", payment: "other", estimatedCostCents: 100 })) }));
    const input = { diningBalanceCents: 1000, hokiePassportBalanceCents: 0, weeksRemaining: 1, allowHokiePassport: false, diningPlan: "Dining Dollars only" };
    const draft = { strategy: "Plan", days, weeklyDiningSpendCents: 999, projectedDiningSpendCents: 999, remainingDiningBalanceCents: 1, assumptions: [], warnings: Array.from({ length: 10 }, () => "Model note"), hoursUrl: "https://apps.students.vt.edu/hours/#/", source: "vt_arc", model: "test" };
    const result = normalizeDiningResult(input, draft);
    expect(result.weeklyDiningSpendCents).toBe(0); expect(result.remainingDiningBalanceCents).toBe(1000);
    expect(result.warnings.join(" ")).toContain("estimates"); expect(result.warnings.join(" ")).toContain("2100 cents");
    days[0]!.meals[0]!.payment = "meal_exchange";
    expect(() => normalizeDiningResult(input, draft)).toThrow("swipes or exchanges");
  });

  it("repairs malformed AI JSON once then safely returns the scenario form", async () => {
    const service = serviceWithReplies(["not json", "still not json"]);
    const result = await service.chat(actor, { message: "Can I buy something?", snapshotId: "snapshot-1", planVersion: 1, selectedGoalId: null });
    expect(result.executionSource).toBe("unavailable");
    expect(result.text).toContain("scenario form");
  });

  it("uses the deterministic projection for goal timing", async () => {
    const service = serviceWithReplies(['{"intent":"goal_timing","goalId":"goal-1"}']);
    const result = await service.chat(actor, { message: "When will Tuition finish?", snapshotId: "snapshot-1", planVersion: 1, selectedGoalId: null });
    expect(result.text).toContain("2026-12-01");
    expect(result.text).toContain("$12.50");
  });

  it("asks for an actual proposed purchase before claiming recovery", async () => {
    const service = serviceWithReplies(['{"intent":"recovery","goalId":"goal-1"}']);
    const result = await service.chat(actor, { message: "How do I recover?", snapshotId: "snapshot-1", planVersion: 1, selectedGoalId: null });
    expect(result.kind).toBe("clarification");
    expect(result.text).toContain("purchase amount");
  });

  it("does not force a goal for a dated discretionary purchase", async () => {
    const service = serviceWithReplies(['{"intent":"purchase","amountCents":500,"date":"2026-09-20","goalId":null}']);
    const result = await service.chat(actor, { message: "Can I buy it tomorrow?", snapshotId: "snapshot-1", planVersion: 1, selectedGoalId: null });
    expect(result.kind).not.toBe("clarification");
  });

  it("clarifies unknown model-selected goals", async () => {
    const service = serviceWithReplies(['{"intent":"goal_timing","goalId":"missing"}']);
    const result = await service.chat(actor, { message: "When is other goal done?", snapshotId: "snapshot-1", planVersion: 1, selectedGoalId: null });
    expect(result.text).toContain("could not match");
  });

  it("rejects a dining plan that overspends Hokie Passport", () => {
    const meals = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({ day, meals: ["Breakfast", "Lunch", "Dinner"].map((label) => ({ label, venue: "Place", suggestion: "Estimated option", payment: "hokie_passport", estimatedCostCents: 100 })) }));
    expect(() => normalizeDiningResult({ diningBalanceCents: 0, hokiePassportBalanceCents: 100, weeksRemaining: 1, allowHokiePassport: true, diningPlan: "Unlimited" }, { strategy: "Plan", days: meals, assumptions: [], warnings: [], hoursUrl: "https://apps.students.vt.edu/hours/#/", source: "vt_arc", model: "test" })).toThrow("Hokie Passport");
  });
});


describe("coach recovery affordability", () => {
  it.each([
    { affordable: null, description: "affordability not yet established" },
    { affordable: true, description: "currently affordable" },
    { affordable: false, description: "not currently affordable" },
  ])("keeps recovery funding status $affordable distinct in the chat narrative", async ({ affordable, description }) => {
    const example = JSON.parse(readFileSync(new URL("../../contracts/examples/scenario-goal-delay.json", import.meta.url), "utf8")) as ScenarioComparison;
    const comparison: ScenarioComparison = {
      ...example,
      snapshotId: "snapshot-1",
      goalImpacts: example.goalImpacts.map((impact) => ({ ...impact, goalId: "goal-1", nextWeekAffordable: affordable, remainingWeeklyAffordable: affordable })),
    };
    const service = createAgentService(readConfig({ ARC_API_KEY: "key", LOG_LEVEL: "silent", PLANNER_ALLOW_LOCAL_FALLBACK: "true" }), limits, {
      overview: async () => ({ snapshot, plan, projection }),
      planner: async () => comparison,
    }, { fetch: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"intent":"purchase","amountCents":15000,"date":"2026-09-21","goalId":"goal-1"}' } }] })), now: () => new Date("2026-09-19T12:00:00Z") });
    const reply = await service.chat(actor, { message: "What happens if I spend $150 on September 21 using Tuition?", snapshotId: "snapshot-1", planVersion: 1, selectedGoalId: "goal-1" });
    expect(reply.executionSource).toBe("local_fallback");
    expect(reply.text).toContain(`Catch-up next week: $100.00 (${description})`);
    expect(reply.text).toContain(`$12.50 per week (${description})`);
    expect(reply.comparison?.goalImpacts[0]?.nextWeekAffordable).toBe(affordable);
    if (affordable === null) expect(reply.text).not.toContain("currently affordable");
  });
});
