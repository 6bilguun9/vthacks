import { afterEach, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";
import { calendarDate } from "../src/application/demo.js";
import { MemoryInfrastructure } from "./helpers/memory.js";
import type { OwnedState } from "../src/domain/model.js";

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

it("runs chat through mocked ANS discovery and the real signed planner HTTP handler without saving", async () => {
  const now = new Date(); const today = calendarDate(now);
  const memory = new MemoryInfrastructure({ token: "presenter" });
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input); calls.push(url);
    if (url.endsWith("/chat/completions")) return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ intent: "purchase", amountCents: 1000, date: today, goalId: null, cadence: "once" }) } }] }));
    if (url.endsWith("/v1/agents/resolution")) return new Response(JSON.stringify({ links: [{ rel: "agent-endpoint", href: "https://planner.example.com/api/v1/agents/planner" }] }));
    if (url === "https://planner.example.com/api/v1/agents/planner") {
      const response = await app.inject({ method: "POST", url: "/api/v1/agents/planner", headers: Object.fromEntries(new Headers(init?.headers).entries()), payload: String(init?.body) });
      expect(response.statusCode, response.body).toBe(200);
      return new Response(response.body, { status: response.statusCode });
    }
    throw new Error("Unexpected provider URL");
  };
  const app = createApp(readConfig({ LOG_LEVEL: "silent", AI_MODE: "presenter", PRESENTER_USER_IDS: "presenter", ARC_API_KEY: "test", ANS_API_KEY: "key:secret", PLANNER_AGENT_HOST: "planner.example.com", AGENT_SIGNING_SECRET: "test-signing-secret-at-least-32-characters" }), { auth: memory.auth, repository: memory.repository, limits: memory.limits, clock: () => now, fetch: fetcher }); apps.push(app);
  const headers = { authorization: "Bearer token" };
  const initial = (await app.inject({ method: "POST", url: "/api/v1/session/bootstrap", headers, payload: { source: "fixture" } })).json<OwnedState>();
  const plan = { ...initial.plan, selectedBankAccountIds: ["demo-checking"], incomeComplete: true, expensesComplete: true, discretionaryConfirmedAt: now.toISOString() };
  const saved = await app.inject({ method: "POST", url: "/api/v1/plan/commit", headers, payload: { expectedVersion: 1, snapshotId: initial.snapshot.id, idempotencyKey: "setup", change: { kind: "replace_plan", plan } } });
  expect(saved.statusCode, saved.body).toBe(200);
  const chat = await app.inject({ method: "POST", url: "/api/v1/chat", headers, payload: { message: "Can I spend $10 today?", snapshotId: initial.snapshot.id, planVersion: 2, selectedGoalId: null } });
  expect(chat.statusCode, chat.body).toBe(200); expect(chat.json()).toMatchObject({ kind: "comparison", executionSource: "ans_remote", comparison: { status: "uses_unallocated_cash" } });
  expect(calls).toHaveLength(3);
  const overview = (await app.inject({ method: "GET", url: "/api/v1/overview", headers })).json();
  expect(overview.plan.version).toBe(2); expect(overview.plan.plannedPurchases).toEqual([]);
});
