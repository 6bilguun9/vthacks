import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";
import { MemoryInfrastructure } from "./helpers/memory.js";

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe("dining planner", () => {
  it("rejects dollar floats because the contract uses integer cents", async () => {
    const app = createApp(readConfig({ LOG_LEVEL: "silent" })); apps.push(app);
    const response = await app.inject({ method: "POST", url: "/api/v1/dining-plans", payload: { diningPlan: "Unlimited", studentStatus: "First-year, on campus", diningBalanceCents: 22.5, hokiePassportBalanceCents: 0, weeksRemaining: 15, preferences: "vegetarian" } });
    expect(response.statusCode).toBe(422);
  });

  it("does not expose the AI provider without configured guest authentication", async () => {
    const app = createApp(readConfig({ LOG_LEVEL: "silent" })); apps.push(app);
    const response = await app.inject({ method: "POST", url: "/api/v1/dining-plans", payload: { diningPlan: "Unlimited", studentStatus: "First-year, on campus", diningBalanceCents: 22500, hokiePassportBalanceCents: 0, weeksRemaining: 15, preferences: "vegetarian" } });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("STORAGE_UNAVAILABLE");
  });

  it("uses OpenRouter through the provider boundary and recomputes meal totals", async () => {
    const memory = new MemoryInfrastructure({ token: "presenter" });
    const providerCalls: Array<{ url: string; authorization: string | null; body: unknown }> = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
      day,
      meals: ["breakfast", "lunch", "dinner"].map((label) => ({ label, venue: "Dining hall", suggestion: "Vegetarian option (confirm today's menu)", payment: "dining_balance", estimatedCostCents: 100 })),
    }));
    const fetcher: typeof fetch = async (input, init) => {
      providerCalls.push({ url: String(input), authorization: new Headers(init?.headers).get("authorization"), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ strategy: "Use restricted dining funds first.", days, weeklyDiningSpendCents: 1, projectedDiningSpendCents: 1, remainingDiningBalanceCents: 1, assumptions: [], warnings: [], hoursUrl: "https://apps.students.vt.edu/hours/#/", source: "vt_arc", model: "untrusted-model" }) } }] }));
    };
    const app = createApp(readConfig({ LOG_LEVEL: "silent", AI_MODE: "presenter", PRESENTER_USER_IDS: "presenter", AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "test-openrouter-key" }), { auth: memory.auth, repository: memory.repository, limits: memory.limits, fetch: fetcher }); apps.push(app);
    const response = await app.inject({ method: "POST", url: "/api/v1/dining-plans", headers: { authorization: "Bearer token" }, payload: { diningPlan: "Dining Dollars only", studentStatus: "Off campus", diningBalanceCents: 3000, hokiePassportBalanceCents: 0, weeksRemaining: 1, preferences: "vegetarian" } });
    expect(providerCalls).toEqual([{ url: "https://openrouter.ai/api/v1/chat/completions", authorization: "Bearer test-openrouter-key", body: expect.objectContaining({ max_tokens: 5000 }) }]);
    expect(providerCalls[0]?.body).not.toHaveProperty("reasoning_effort");
    expect(response.statusCode, response.body).toBe(200);
    const result = response.json();
    expect(result).toMatchObject({ source: "openrouter", model: "openrouter/free", weeklyDiningSpendCents: 2100, projectedDiningSpendCents: 2100, remainingDiningBalanceCents: 900 });
    expect(result.days[0].meals.map((meal: { label: string }) => meal.label)).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });

  it("uses its one bounded repair when the provider returns malformed JSON", async () => {
    const memory = new MemoryInfrastructure({ token: "presenter" });
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({
      day,
      meals: ["Breakfast", "Lunch", "Dinner"].map((label) => ({ label, venue: "Dining hall", suggestion: "Confirm today's menu", payment: "dining_balance", estimatedCostCents: 50 })),
    }));
    const replies = ["{\"incomplete\":", JSON.stringify({ strategy: "Use dining funds first.", days, weeklyDiningSpendCents: 0, projectedDiningSpendCents: 0, remainingDiningBalanceCents: 0, assumptions: [], warnings: [], hoursUrl: "https://apps.students.vt.edu/hours/#/", source: "openrouter", model: "openrouter/free" })];
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: replies.shift() ?? "{}" } }] }));
    const app = createApp(readConfig({ LOG_LEVEL: "silent", AI_MODE: "presenter", PRESENTER_USER_IDS: "presenter", AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "test-openrouter-key" }), { auth: memory.auth, repository: memory.repository, limits: memory.limits, fetch: fetcher }); apps.push(app);
    const response = await app.inject({ method: "POST", url: "/api/v1/dining-plans", headers: { authorization: "Bearer token" }, payload: { diningPlan: "Dining Dollars only", studentStatus: "Off campus", diningBalanceCents: 2000, hokiePassportBalanceCents: 0, weeksRemaining: 1, preferences: "vegetarian" } });
    expect(response.statusCode, response.body).toBe(200);
    expect(replies).toHaveLength(0);
  });
});
