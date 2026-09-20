import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/create-app.js";
import { readConfig } from "../src/config/env.js";
import { MemoryInfrastructure } from "./helpers/memory.js";
import type { OwnedState, Plan } from "../src/domain/model.js";

const applications: ReturnType<typeof createApp>[] = [];
const now = new Date("2026-09-19T12:00:00Z");
afterEach(async () => { await Promise.all(applications.splice(0).map(app => app.close())); });
function setup(environment: Record<string, string> = {}, fetcher?: typeof fetch) {
  const memory = new MemoryInfrastructure({ alice: "user-a", bob: "user-b" });
  let currentTime = now;
  const app = createApp(readConfig({ LOG_LEVEL: "silent", ...environment }), { ...memory, auth: memory.auth, repository: memory.repository, limits: memory.limits, clock: () => currentTime, ...(fetcher ? { fetch: fetcher } : {}) });
  applications.push(app);
  const call = (method: "GET" | "POST", url: string, payload?: unknown, token = "alice") => app.inject({ method, url: `/api/v1${url}`, headers: { authorization: `Bearer ${token}` }, ...(payload === undefined ? {} : { payload: JSON.stringify(payload), headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } }) });
  async function bootstrap(token = "alice") { const response = await call("POST", "/session/bootstrap", { source: "fixture" }, token); expect(response.statusCode, response.body).toBe(200); return response.json<OwnedState>(); }
  return { app, memory, call, bootstrap, advance: (ms: number) => { currentTime = new Date(currentTime.getTime() + ms); } };
}
function readyPlan(state: OwnedState): Plan {
  return { ...state.plan, selectedBankAccountIds: ["demo-checking"], incomeComplete: true, expensesComplete: true, discretionaryConfirmedAt: now.toISOString(), cashBufferCents: 10000, goals: [{ id: "laptop", name: "Laptop", targetCents: 100000, allocatedCents: 20000, weeklyContributionCents: 10000, contributionStartDate: "2026-09-21", targetDate: null }] };
}

describe("authorized financial workflow", () => {
  it("requires authentication and keeps user data isolated", async () => {
    const { app, call, bootstrap } = setup();
    expect((await app.inject({ method: "GET", url: "/api/v1/overview" })).statusCode).toBe(401);
    const first = await bootstrap(); const second = await bootstrap("bob");
    expect(first.plan.id).not.toBe(second.plan.id);
    expect(first.snapshot.accounts[0]).not.toHaveProperty("customerId");
    expect((await call("POST", "/plan/preview", { expectedVersion: first.plan.version, snapshotId: first.snapshot.id, proposedPlan: readyPlan(first) }, "bob")).statusCode).toBe(409);
    expect((await bootstrap()).plan.id).toBe(first.plan.id);
    expect((await call("GET", "/overview")).headers["cache-control"]).toBe("no-store");
  });
  it("previews without mutation, saves atomically, retries once, and rejects changed key payloads", async () => {
    const { call, bootstrap } = setup(); const initial = await bootstrap(); const proposed = readyPlan(initial);
    const preview = await call("POST", "/plan/preview", { expectedVersion: 1, snapshotId: initial.snapshot.id, proposedPlan: proposed });
    expect(preview.statusCode, preview.body).toBe(200);
    expect(preview.json().projection.feasibility).toBe("feasible");
    expect((await call("GET", "/overview")).json().plan.goals).toEqual([]);
    const body = { expectedVersion: 1, snapshotId: initial.snapshot.id, idempotencyKey: "save-1", change: { kind: "replace_plan", plan: proposed } };
    const [first, retry] = await Promise.all([call("POST", "/plan/commit", body), call("POST", "/plan/commit", body)]);
    expect(first.statusCode, first.body).toBe(200); expect(retry.statusCode, retry.body).toBe(200);
    expect(first.json()).toEqual(retry.json()); expect(first.json().version).toBe(2);
    expect((await call("POST", "/plan/commit", { ...body, change: { kind: "replace_plan", plan: { ...proposed, cashBufferCents: 20000 } } })).statusCode).toBe(409);
    expect((await call("POST", "/plan/commit", { ...body, idempotencyKey: "save-2" })).statusCode).toBe(409);
  });
  it("invalidates old previews after manual data changes and keeps campus funds separate", async () => {
    const { call, bootstrap } = setup(); const initial = await bootstrap();
    const response = await call("POST", "/data/manual", { expectedVersion: 1, snapshotId: initial.snapshot.id, campusBalances: [{ id: "dining", name: "Dining", balanceCents: 10000000, restriction: "campus dining only", asOf: now.toISOString() }], universityCharges: [{ id: "tuition", name: "Tuition", amountCents: 300000, dueDate: null, fundingGoalId: null, asOf: now.toISOString() }] });
    expect(response.statusCode, response.body).toBe(200); expect(response.json().plan.version).toBe(2);
    expect(response.json().snapshot.accounts).toEqual(initial.snapshot.accounts);
    expect((await call("POST", "/plan/preview", { expectedVersion: 1, snapshotId: initial.snapshot.id, proposedPlan: readyPlan(initial) })).statusCode).toBe(409);
  });
  it("does not switch to fabricated banking data when the provider fails", async () => {
    const { call, bootstrap } = setup({ NESSIE_API_KEY: "synthetic-test-key", NESSIE_CUSTOMER_ID: "sample" }, async () => { throw new Error("sensitive provider URL"); });
    const initial = await bootstrap(); const response = await call("POST", "/data/refresh", {});
    expect(response.statusCode).toBe(502); expect(response.body).not.toContain("sensitive");
    expect((await call("GET", "/overview")).json().snapshot.id).toBe(initial.snapshot.id);
  });
  it("rejects conflicting duplicate provider records and preserves the previous snapshot", async () => {
    const account = { _id: "duplicate", customer_id: "sample", type: "Checking", balance: 100 };
    const { call, bootstrap } = setup({ NESSIE_API_KEY: "test", NESSIE_CUSTOMER_ID: "sample" }, async () => new Response(JSON.stringify([account, { ...account, balance: 200 }])));
    const before = await bootstrap();
    expect((await call("POST", "/data/refresh", {})).statusCode).toBe(502);
    expect((await call("GET", "/overview")).json().snapshot.id).toBe(before.snapshot.id);
  });
  it("normalizes read-only Nessie records, rejects foreign accounts, and strips customer ids", async () => {
    const calls: string[] = [];
    const { call, bootstrap } = setup({ NESSIE_API_KEY: "synthetic-test-key", NESSIE_CUSTOMER_ID: "sample" }, async (url, init) => {
      expect(init?.method).toBe("GET"); calls.push(new URL(String(url)).pathname);
      return new Response(JSON.stringify(calls.length === 1 ? [{ _id: "a1", customer_id: "sample", type: "Checking", balance: 123.45 }] : [{ _id: "p1", purchase_date: "2026-09-18", amount: 12.25, status: "completed" }]));
    });
    await bootstrap(); const response = await call("POST", "/data/refresh", {});
    expect(response.statusCode, response.body).toBe(200); expect(response.json().accounts[0].balanceCents).toBe(12345);
    expect(response.json().accounts[0]).not.toHaveProperty("customerId"); expect(response.json().transactions[0].amountCents).toBe(1225);
    expect(calls).toEqual(["/customers/sample/accounts", "/accounts/a1/purchases"]);
  });
  it("rejects direct injection of completed purchases and reserves AI for presenters", async () => {
    const { call, bootstrap } = setup({ AI_MODE: "presenter", PRESENTER_USER_IDS: "user-b" }); const initial = await bootstrap();
    const payload = { message: "Can I spend $10?", snapshotId: initial.snapshot.id, planVersion: 1, selectedGoalId: null };
    expect((await call("POST", "/chat", payload)).statusCode).toBe(403);
    const proposed = readyPlan(initial); proposed.plannedPurchases.push({ id: "fake", description: "fake", amountCents: 100, date: "2026-09-19", fundingGoalId: null, status: "completed", matchedTransactionId: "fake", funding: { discretionaryCents: 0, goalCents: 0, unallocatedCents: 100 } });
    expect((await call("POST", "/plan/preview", { expectedVersion: 1, snapshotId: initial.snapshot.id, proposedPlan: proposed })).statusCode).toBe(422);
  });
  it("reconciles a saved purchase against a refreshed balance without deducting it twice", async () => {
    const { call, bootstrap, advance } = setup({ NESSIE_API_KEY: "test", NESSIE_CUSTOMER_ID: "sample" }, async input => new Response(JSON.stringify(new URL(String(input)).pathname.endsWith("/accounts")
      ? [{ _id: "demo-checking", customer_id: "sample", type: "Checking", balance: 1490 }]
      : [{ _id: "purchase-1", purchase_date: "2026-09-19", amount: 10, status: "completed" }])));
    const initial = await bootstrap();
    await call("POST", "/plan/commit", { expectedVersion: 1, snapshotId: initial.snapshot.id, idempotencyKey: "base", change: { kind: "replace_plan", plan: readyPlan(initial) } });
    const scenario = { snapshotId: initial.snapshot.id, planVersion: 2, kind: "purchase", amountCents: 1000, date: "2026-09-19", cadence: "once", goalId: null };
    const preview = await call("POST", "/scenarios", scenario); expect(preview.statusCode, preview.body).toBe(200);
    expect((await call("GET", "/overview")).json().plan.version).toBe(2);
    const saved = await call("POST", "/plan/commit", { expectedVersion: 2, snapshotId: initial.snapshot.id, idempotencyKey: "purchase", change: { kind: "apply_scenario", scenario } });
    expect(saved.statusCode, saved.body).toBe(200);
    advance(2000);
    expect((await call("POST", "/data/refresh", {})).statusCode).toBe(200);
    const refreshed = (await call("GET", "/overview")).json();
    expect(refreshed.plan.version).toBe(4); expect(refreshed.projection.feasibility).toBe("needs_information");
    const reconciled = await call("POST", "/plan/commit", { expectedVersion: 4, snapshotId: refreshed.snapshot.id, idempotencyKey: "reconcile", change: { kind: "reconcile_purchase", purchaseId: saved.json().plannedPurchases[0].id, action: "match", transactionId: "nessie:purchase:purchase-1" } });
    expect(reconciled.statusCode, reconciled.body).toBe(200);
    const final = (await call("GET", "/overview")).json();
    expect(final.plan.plannedPurchases[0].status).toBe("completed");
    expect(final.snapshot.accounts[0].balanceCents).toBe(149000);
    expect(final.projection.minimumUnallocatedCashCents).toBe(39000);
  });
});
