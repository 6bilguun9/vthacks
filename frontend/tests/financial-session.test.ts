import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, overviewResponseSchema } from "../src/lib/api";
import { FinancialSessionController, GUEST_KEY, MODE_KEY, type GuestAuth } from "../src/features/session/session-controller";
import { validPublicSupabaseConfig } from "../src/features/session/public-config";

const overview = overviewResponseSchema.parse(JSON.parse(readFileSync(new URL("../../contracts/examples/overview.json", import.meta.url), "utf8")));
const alice = { access_token: "alice-test-token", user: { id: "alice" } };
const bob = { access_token: "bob-test-token", user: { id: "bob" } };
const stops: (() => void)[] = [];
afterEach(() => { stops.splice(0).forEach(stop => stop()); });
function setup(options: { session?: typeof alice | null; savedMode?: string; savedGuest?: string; load?: () => Promise<typeof overview>; siteKey?: string | null } = {}) {
  let session = options.session === undefined ? alice : options.session;
  let listener: ((event: string, session: typeof alice | null) => void) | undefined;
  const saved = new Map<string, string>();
  if (options.savedMode) saved.set(MODE_KEY, options.savedMode);
  if (options.savedGuest) saved.set(GUEST_KEY, options.savedGuest);
  const getSession = vi.fn(async () => ({ data: { session }, error: null as unknown }));
  const signInAnonymously = vi.fn(async () => { session = alice; return { data: { session }, error: null }; });
  const auth: GuestAuth = {
    getSession, signInAnonymously,
    onAuthStateChange(callback) { listener = callback; return { data: { subscription: { unsubscribe: () => { listener = undefined; } } } }; },
  };
  const load = vi.fn<(options: { accessToken: string; signal: AbortSignal }) => Promise<typeof overview>>(options.load ?? (async () => overview));
  const bootstrap = vi.fn(async () => overview);
  const controller = new FinancialSessionController({
    auth, config: { supabaseConfigured: true, turnstileSiteKey: options.siteKey === null ? undefined : options.siteKey ?? "public-test-key" },
    storage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => { saved.set(key, value); } }, load, bootstrap,
  });
  stops.push(controller.start());
  return { controller, getSession, signInAnonymously, load, bootstrap, saved, emit(next: typeof alice | null, event = "SIGNED_IN") { session = next; listener?.(event, next); } };
}
async function settle() { await new Promise(resolve => setTimeout(resolve, 0)); }

describe("financial guest session", () => {
  it("does not load financial data until the student selects the connected experience", async () => {
    const { controller, load, bootstrap } = setup();
    await settle();
    expect(controller.getSnapshot()).toMatchObject({ mode: "demo", overview: null });
    expect(load).not.toHaveBeenCalled();
    expect(bootstrap).not.toHaveBeenCalled();
  });
  it("restores the explicitly selected live mode and loads existing state without bootstrapping", async () => {
    const { controller, load, bootstrap, signInAnonymously } = setup({ savedMode: "live" });
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("ready"));
    expect(controller.getSnapshot().overview).toEqual(overview);
    expect(load).toHaveBeenCalledWith({ accessToken: alice.access_token, signal: expect.any(AbortSignal) });
    expect(bootstrap).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("requires an explicit sample-plan action after a missing saved state", async () => {
    const { controller, bootstrap } = setup({ load: async () => { throw new ApiError("Missing state", "http", 404, "STATE_NOT_FOUND"); } });
    await settle();
    await controller.connect();
    expect(controller.getSnapshot()).toMatchObject({ mode: "live", status: "needs_bootstrap", overview: null });
    expect(bootstrap).not.toHaveBeenCalled();
    await controller.startSamplePlan();
    expect(bootstrap).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("keeps live mode on backend failure without substituting demo balances", async () => {
    const { controller, bootstrap } = setup({ load: async () => { throw new ApiError("Request failed", "network"); } });
    await settle();
    await expect(controller.connect()).rejects.toThrow("Request failed");
    expect(controller.getSnapshot()).toMatchObject({ mode: "live", status: "error", overview: null });
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it("never offers bootstrap for an unauthorized request or an unrelated missing route", async () => {
    for (const status of [401, 404]) {
      const { controller, bootstrap } = setup({ load: async () => { throw new ApiError("Request rejected", "http", status, "ROUTE_OR_AUTH_ERROR"); } });
      await settle();
      await expect(controller.connect()).rejects.toThrow("Request rejected");
      expect(controller.getSnapshot().status).toBe("error");
      expect(bootstrap).not.toHaveBeenCalled();
    }
  });

  it("does not create a replacement guest when refreshing an existing session fails", async () => {
    const { controller, getSession, signInAnonymously } = setup();
    await settle();
    getSession.mockResolvedValue({ data: { session: null }, error: new Error("expired") });
    await expect(controller.connect()).rejects.toThrow("replacement guest has not been created");
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(controller.getSnapshot().overview).toBeNull();
  });

  it("preserves a previous guest identity instead of silently starting over after sign-out", async () => {
    const { controller, signInAnonymously } = setup({ session: null, savedGuest: "alice" });
    await settle();
    await expect(controller.connect("captcha-result")).rejects.toThrow("original browser");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("requires verification before creating a guest and forwards only the completed token to auth", async () => {
    const { controller, signInAnonymously } = setup({ session: null });
    await settle();
    await expect(controller.connect()).rejects.toThrow("Complete the verification");
    expect(signInAnonymously).not.toHaveBeenCalled();
    await controller.connect("captcha-result");
    expect(signInAnonymously).toHaveBeenCalledWith({ options: { captchaToken: "captcha-result" } });
    expect(controller.getSnapshot().status).toBe("ready");
  });

  it("cannot bypass guest verification by leaving out the public site key", async () => {
    const { controller, signInAnonymously } = setup({ session: null, siteKey: null });
    await settle();
    await expect(controller.connect("some-value")).rejects.toThrow("Turnstile site key");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it("aborts and ignores an overview that finishes after the student switches to demo", async () => {
    let resolve!: (value: typeof overview) => void;
    const { controller, load } = setup({ load: () => new Promise(done => { resolve = done; }) });
    await settle();
    const pending = controller.connect();
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    controller.useDemo();
    resolve(overview);
    await pending;
    expect(controller.getSnapshot()).toMatchObject({ mode: "demo", overview: null, error: null });
    expect(load.mock.calls[0]?.[0].signal.aborted).toBe(true);
  });

  it("clears the prior guest's overview immediately when auth changes identities", async () => {
    const { controller, emit } = setup();
    await settle();
    await controller.connect();
    expect(controller.getSnapshot().overview).toEqual(overview);
    emit(bob);
    expect(controller.getSnapshot()).toMatchObject({ userId: "bob", overview: null, status: "loading" });
    await vi.waitFor(() => expect(controller.getSnapshot().status).toBe("ready"));
    expect(await controller.getAccessToken()).toBe(bob.access_token);
  });

  it("clears private state after auth signs out while leaving the explicit live selection visible", async () => {
    const { controller, emit } = setup();
    await settle();
    await controller.connect();
    emit(null, "SIGNED_OUT");
    expect(controller.getSnapshot()).toMatchObject({ mode: "live", status: "error", overview: null, userId: null });
    await expect(controller.connect("captcha-result")).rejects.toThrow("original browser");
  });

  it("never returns a new guest's token to an action started from the old guest's view", async () => {
    const { controller, getSession } = setup();
    await settle();
    await controller.connect();
    getSession.mockResolvedValue({ data: { session: bob }, error: null });
    await expect(controller.getAccessToken()).rejects.toThrow("guest session changed");
    expect(controller.getSnapshot()).toMatchObject({ userId: "bob", overview: null });
  });

  it("ignores the prior user's late response even during a connect operation", async () => {
    let finishAlice!: (value: typeof overview) => void;
    const bobOverview = { ...overview, snapshot: { ...overview.snapshot, id: "bob-snapshot" } };
    const { controller, emit, load } = setup();
    load.mockImplementationOnce(() => new Promise(resolve => { finishAlice = resolve; }));
    load.mockResolvedValue(bobOverview);
    await settle();
    const pending = controller.connect();
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    emit(bob);
    await vi.waitFor(() => expect(controller.getSnapshot().overview?.snapshot.id).toBe("bob-snapshot"));
    finishAlice(overview);
    await pending;
    expect(controller.getSnapshot().overview?.snapshot.id).toBe("bob-snapshot");
    expect(controller.getSnapshot().userId).toBe("bob");
  });
});

describe("browser configuration", () => {
  it("accepts publishable or legacy anon keys but rejects privileged keys and invalid origins", () => {
    const token = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
    expect(validPublicSupabaseConfig("https://sample.supabase.co", "sb_publishable_test_public_key")).toBe(true);
    expect(validPublicSupabaseConfig("https://sample.supabase.co", token("anon"))).toBe(true);
    expect(validPublicSupabaseConfig("https://sample.supabase.co", token("service_role"))).toBe(false);
    expect(validPublicSupabaseConfig("https://sample.supabase.co", "sb_secret_test_private_key")).toBe(false);
    expect(validPublicSupabaseConfig("javascript:alert(1)", "sb_publishable_test_public_key")).toBe(false);
    expect(validPublicSupabaseConfig("https://user:password@example.com", "sb_publishable_test_public_key")).toBe(false);
  });
});
