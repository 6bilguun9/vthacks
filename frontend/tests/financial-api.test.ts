import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapSession, chatResponseSchema, commitPlan, compareScenario, createDiningPlan,
  getOverview, overviewResponseSchema, previewPlan, refreshBankData, scenarioComparisonSchema,
  scenarioRequestSchema, sendChat, updateManualData, type CommitRequest, type DiningPlanRequest,
} from "../src/lib/api";
import { sampleDiningPlan } from "../src/features/dining/sample";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../contracts/examples/${name}.json`, import.meta.url), "utf8"));
}
const overview = overviewResponseSchema.parse(fixture("overview"));
const scenario = scenarioRequestSchema.parse(fixture("purchase-request"));
const comparison = scenarioComparisonSchema.parse(fixture("scenario-no-delay"));
const chat = chatResponseSchema.parse(fixture("chat-clarification"));
const options = { accessToken: "guest-test-token", baseUrl: "https://api.example.test" };
const commit: CommitRequest = {
  expectedVersion: overview.plan.version, snapshotId: overview.snapshot.id,
  idempotencyKey: "test-explicit-save", change: { kind: "replace_plan", plan: overview.plan },
};
const dining: DiningPlanRequest = {
  diningPlan: "Unlimited", studentStatus: "First-year, on campus", diningBalanceCents: 30000,
  hokiePassportBalanceCents: 10000, weeksRemaining: 8, preferences: "Vegetarian lunches", allowHokiePassport: false,
};

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("authenticated financial API", () => {
  it("accepts the shared fixtures, preserving unknown estimates and explicit source labels", () => {
    expect(overview.snapshot.source.kind).toBe("fixture");
    expect(overview.projection.minimumUnallocatedCashCents).toBeNull();
    expect(overview.capabilities).toBeUndefined();
    expect(scenarioComparisonSchema.parse(fixture("scenario-goal-delay")).goalImpacts[0]?.nextWeekAffordable).toBeNull();
  });

  it("sends bearer authentication and disables browser caching for every endpoint", async () => {
    const cases: Array<{ path: string; result: unknown; call: () => Promise<unknown>; body?: unknown }> = [
      { path: "/overview", result: overview, call: () => getOverview(options) },
      { path: "/session/bootstrap", result: overview, body: { source: "fixture" }, call: () => bootstrapSession(options) },
      { path: "/data/refresh", result: overview.snapshot, body: {}, call: () => refreshBankData(options) },
      {
        path: "/data/manual", result: { snapshot: overview.snapshot, plan: overview.plan },
        body: { expectedVersion: 1, snapshotId: overview.snapshot.id, campusBalances: [], universityCharges: [] },
        call: () => updateManualData({ expectedVersion: 1, snapshotId: overview.snapshot.id, campusBalances: [], universityCharges: [] }, options),
      },
      {
        path: "/plan/preview", result: { proposedPlan: overview.plan, projection: overview.projection },
        body: { expectedVersion: 1, snapshotId: overview.snapshot.id, proposedPlan: overview.plan },
        call: () => previewPlan({ expectedVersion: 1, snapshotId: overview.snapshot.id, proposedPlan: overview.plan }, options),
      },
      { path: "/scenarios", result: comparison, body: scenario, call: () => compareScenario(scenario, options) },
      { path: "/plan/commit", result: overview.plan, body: commit, call: () => commitPlan(commit, options) },
      {
        path: "/chat", result: chat,
        body: { message: "Can I buy lunch?", snapshotId: overview.snapshot.id, planVersion: 1, selectedGoalId: null },
        call: () => sendChat({ message: "Can I buy lunch?", snapshotId: overview.snapshot.id, planVersion: 1, selectedGoalId: null }, options),
      },
      { path: "/dining-plans", result: sampleDiningPlan, body: dining, call: () => createDiningPlan(dining, options) },
    ];
    for (const entry of cases) {
      const request = vi.fn().mockResolvedValue(Response.json(entry.result));
      vi.stubGlobal("fetch", request);
      await expect(entry.call()).resolves.toEqual(entry.result);
      expect(request).toHaveBeenCalledExactlyOnceWith(`https://api.example.test/api/v1${entry.path}`, expect.objectContaining({
        method: entry.body === undefined ? "GET" : "POST", cache: "no-store", signal: expect.any(AbortSignal),
        headers: expect.objectContaining({ authorization: "Bearer guest-test-token" }),
        ...(entry.body === undefined ? {} : { body: JSON.stringify(entry.body) }),
      }));
    }
  });

  it.each(["", " ", "invalid\ntoken"])("does not make a request without a usable guest token", async (accessToken) => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    await expect(getOverview({ accessToken })).rejects.toMatchObject({ code: "configuration" });
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    [401, "UNAUTHORIZED"], [403, "PRESENTER_REQUIRED"], [404, "STATE_NOT_FOUND"],
    [409, "STALE_PLAN"], [429, "RATE_LIMITED"], [503, "STORAGE_UNAVAILABLE"],
  ])("retains HTTP %i and %s for session/conflict handling without exposing server text", async (status, backendCode) => {
    const request = vi.fn().mockResolvedValue(Response.json({ error: { code: backendCode, message: "private upstream credentials" } }, { status }));
    vi.stubGlobal("fetch", request);
    const error = await getOverview(options).catch((value: unknown) => value);
    expect(error).toMatchObject({ code: "http", status, backendCode });
    expect((error as Error).message).not.toContain("private upstream");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("handles non-JSON errors safely and never retries a write automatically", async () => {
    const request = vi.fn().mockResolvedValue(new Response("private proxy error", { status: 503 }));
    vi.stubGlobal("fetch", request);
    await expect(commitPlan(commit, options)).rejects.toMatchObject({ code: "http", status: 503 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...overview, plan: { ...overview.plan, version: 0 } },
    { ...overview, projection: { ...overview.projection, minimumUnallocatedCashCents: 1.25 } },
    { ...overview, capabilities: { ai: "true", nessieConfigured: false, today: "2026-09-21" } },
    { ...overview, snapshot: { ...overview.snapshot, currency: "EUR" } },
  ])("rejects incompatible financial responses instead of showing invalid balances", async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(getOverview(options)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("requires calculated results when FinBot says it performed a comparison", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...chat, kind: "comparison", comparison: null })));
    await expect(sendChat({ message: "Check $150", snapshotId: overview.snapshot.id, planVersion: 1, selectedGoalId: null }, options)).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("reports input validation separately from connection failures before sending a request", async () => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    await expect(compareScenario({ ...scenario, amountCents: 12.5 }, options)).rejects.toMatchObject({ code: "invalid_request" });
    await expect(compareScenario({ ...scenario, date: "2026-02-30" }, options)).rejects.toMatchObject({ code: "invalid_request" });
    await expect(createDiningPlan({ ...dining, preferences: " " }, options)).rejects.toMatchObject({ code: "invalid_request" });
    expect(request).not.toHaveBeenCalled();
  });

  it("preserves an explicit canceled request and does not contact the service", async () => {
    const request = vi.fn(); vi.stubGlobal("fetch", request);
    const controller = new AbortController(); controller.abort();
    await expect(getOverview({ ...options, signal: controller.signal })).rejects.toMatchObject({ code: "aborted" });
    expect(request).not.toHaveBeenCalled();
  });

  it("combines caller cancellation with the request deadline", async () => {
    const controller = new AbortController();
    const request = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    vi.stubGlobal("fetch", request);
    const response = getOverview({ ...options, signal: controller.signal });
    controller.abort();
    await expect(response).rejects.toMatchObject({ code: "aborted" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("bounds financial requests and distinguishes timeout from user cancellation", async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    const request = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    }));
    vi.stubGlobal("fetch", request);
    const response = commitPlan(commit, options);
    deadline.abort(new DOMException("Expired", "TimeoutError"));
    await expect(response).rejects.toMatchObject({ code: "network", message: expect.stringContaining("Reload your plan") });
    expect(timeout).toHaveBeenCalledWith(15_000);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("allows longer bounded deadlines for banking refresh, chat, and dining", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(overview.snapshot)).mockResolvedValueOnce(Response.json(chat)).mockResolvedValueOnce(Response.json(sampleDiningPlan)));
    await refreshBankData(options);
    await sendChat({ message: "Explain my plan", snapshotId: overview.snapshot.id, planVersion: 1, selectedGoalId: null }, options);
    await createDiningPlan(dining, options);
    expect(timeout.mock.calls.map(([duration]) => duration)).toEqual([40_000, 60_000, 105_000]);
  });
});
