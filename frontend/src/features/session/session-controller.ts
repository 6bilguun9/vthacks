import { ApiError, type OverviewResponse } from "../../lib/api";

export type FinancialMode = "demo" | "live";
export type SessionStatus = "unconfigured" | "idle" | "connecting" | "loading" | "ready" | "needs_bootstrap" | "error";
export type SessionConfig = { supabaseConfigured: boolean; turnstileSiteKey?: string };
export type FinancialSessionState = { mode: FinancialMode; status: SessionStatus; overview: OverviewResponse | null; error: string | null; userId: string | null };
type GuestSession = { access_token: string; user: { id: string } };
type AuthResult = { data: { session: GuestSession | null }; error: unknown };
export type GuestAuth = {
  getSession(): Promise<AuthResult>;
  signInAnonymously(options: { options: { captchaToken: string } }): Promise<AuthResult>;
  onAuthStateChange(callback: (event: string, session: GuestSession | null) => void): { data: { subscription: { unsubscribe(): void } } };
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
type Dependencies = {
  auth: GuestAuth | null;
  config: SessionConfig;
  storage?: Storage;
  load(options: { accessToken: string; signal: AbortSignal }): Promise<OverviewResponse>;
  bootstrap(options: { accessToken: string; signal: AbortSignal }): Promise<OverviewResponse>;
};
export const MODE_KEY = "hokie-wallet-financial-mode";
export const GUEST_KEY = "hokie-wallet-guest-id";
const lostSessionMessage = "Your saved guest session could not be restored. Retry in the original browser; creating another guest would not recover this plan.";

/** Owns session lifecycle, never financial calculations or provider credentials. */
export class FinancialSessionController {
  private state: FinancialSessionState;
  private listeners = new Set<() => void>();
  private requestVersion = 0;
  private lifecycle = 0;
  private choiceVersion = 0;
  private identityVersion = 0;
  private abort: AbortController | null = null;
  private rememberedGuest: string | null = null;
  private authOperation = false;
  private active = false;
  constructor(private readonly dependencies: Dependencies) {
    this.state = { mode: "demo", status: dependencies.config.supabaseConfigured ? "idle" : "unconfigured", overview: null, error: null, userId: null };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private patch(update: Partial<FinancialSessionState>) { this.state = { ...this.state, ...update }; this.listeners.forEach(listener => listener()); }
  private read(key: string) { try { return this.dependencies.storage?.getItem(key) ?? null; } catch { return null; } }
  private persist(key: string, value: string) { try { this.dependencies.storage?.setItem(key, value); } catch { /* The current tab can still work without persistent storage. */ } }
  private invalidate() { this.requestVersion++; this.abort?.abort(); this.abort = null; }
  private fail(message: string) { this.invalidate(); this.patch({ overview: null, status: "error", error: message }); }
  private acceptSession(session: GuestSession | null) {
    const nextUser = session?.user.id ?? null;
    if (nextUser) { this.rememberedGuest = nextUser; this.persist(GUEST_KEY, nextUser); }
    if (nextUser === this.state.userId) return false;
    this.identityVersion++;
    this.invalidate();
    this.patch({ userId: nextUser, overview: null, error: null, status: this.state.mode === "live" ? (nextUser ? "loading" : "error") : "idle" });
    return true;
  }
  start = () => {
    this.active = true;
    const generation = ++this.lifecycle;
    const choice = this.choiceVersion;
    const identity = this.identityVersion;
    const auth = this.dependencies.auth;
    this.rememberedGuest = this.read(GUEST_KEY);
    if (this.read(MODE_KEY) === "live") this.patch({ mode: "live", status: auth ? "loading" : "unconfigured" });
    if (!auth) return () => { this.active = false; this.lifecycle++; this.invalidate(); };
    const { data } = auth.onAuthStateChange((event, session) => {
      if (!this.active || generation !== this.lifecycle || event === "INITIAL_SESSION") return;
      const changed = this.acceptSession(session);
      if (this.state.mode !== "live") return;
      if (!session) { this.fail(lostSessionMessage); return; }
      // Leave Supabase's synchronous auth callback before calling its async methods.
      if (changed) setTimeout(() => {
        if (this.active && generation === this.lifecycle && this.state.mode === "live") void this.reload().catch(() => {});
      }, 0);
    });
    void auth.getSession().then(async result => {
      if (!this.active || generation !== this.lifecycle || choice !== this.choiceVersion || identity !== this.identityVersion) return;
      if (result.error) { if (this.state.mode === "live") this.fail("We could not refresh your guest session. Retry your connection; your saved plan has not been replaced."); return; }
      this.acceptSession(result.data.session);
      if (this.state.mode === "live") {
        if (result.data.session) await this.reload().catch(() => {});
        else this.patch({ status: this.rememberedGuest ? "error" : "idle", error: this.rememberedGuest ? lostSessionMessage : null });
      }
    }).catch(() => { if (this.active && generation === this.lifecycle && choice === this.choiceVersion && identity === this.identityVersion && this.state.mode === "live") this.fail("Could not restore your guest session. Retry your connection."); });
    return () => { this.active = false; this.lifecycle++; data.subscription.unsubscribe(); this.invalidate(); };
  };
  getAccessToken = async (): Promise<string> => {
    const auth = this.dependencies.auth;
    if (!auth || this.state.mode !== "live") throw new Error("Connect your sandbox session first.");
    const lifecycle = this.lifecycle;
    const choice = this.choiceVersion;
    const identity = this.identityVersion;
    // Supabase refreshes an expired session here. The backend independently verifies the token.
    const result = await auth.getSession().catch(() => ({ data: { session: null }, error: true }));
    if (lifecycle !== this.lifecycle || choice !== this.choiceVersion || identity !== this.identityVersion || this.state.mode !== "live") throw new Error("The active session changed. Please try again.");
    if (result.error || !result.data.session) { this.fail(lostSessionMessage); throw new Error(lostSessionMessage); }
    if (this.acceptSession(result.data.session)) {
      setTimeout(() => {
        if (this.active && lifecycle === this.lifecycle && choice === this.choiceVersion && this.state.mode === "live") void this.reload().catch(() => {});
      }, 0);
      throw new Error("Your guest session changed. Reload the plan before making a request.");
    }
    return result.data.session.access_token;
  };
  connect = async (captchaToken?: string): Promise<void> => {
    const auth = this.dependencies.auth;
    if (!auth) { this.patch({ status: "unconfigured", error: "The public connection settings have not been added to this app yet." }); throw new Error("Connection settings are missing."); }
    if (this.authOperation) return;
    this.authOperation = true;
    const choice = ++this.choiceVersion;
    this.invalidate();
    this.persist(MODE_KEY, "live");
    this.patch({ mode: "live", status: "connecting", overview: null, error: null });
    const lifecycle = this.lifecycle;
    try {
      const result = await auth.getSession().catch(() => ({ data: { session: null }, error: true }));
      if (lifecycle !== this.lifecycle || choice !== this.choiceVersion || this.state.mode !== "live") return;
      if (result.error) throw new Error("We could not refresh your guest session. Retry; a replacement guest has not been created.");
      let session = result.data.session;
      if (!session) {
        if (this.rememberedGuest) throw new Error(lostSessionMessage);
        if (!this.dependencies.config.turnstileSiteKey) throw new Error("Guest verification has not been configured. Ask the team to add the public Turnstile site key.");
        if (!captchaToken) throw new Error("Complete the verification before connecting.");
        const created = await auth.signInAnonymously({ options: { captchaToken } }).catch(() => ({ data: { session: null }, error: true }));
        if (lifecycle !== this.lifecycle || choice !== this.choiceVersion || this.state.mode !== "live") return;
        if (created.error || !created.data.session) throw new Error("Guest sign-in did not complete. Retry verification, or ask the team to check anonymous sign-ins and CAPTCHA settings.");
        session = created.data.session;
      }
      this.acceptSession(session);
      await this.reload();
    } catch (error) {
      if (lifecycle === this.lifecycle && choice === this.choiceVersion && this.state.mode === "live") this.fail(error instanceof Error ? error.message : "Could not connect your guest session.");
      throw error;
    } finally { this.authOperation = false; }
  };
  private async request(initialize: boolean) {
    const accessToken = await this.getAccessToken();
    this.invalidate();
    const version = this.requestVersion;
    const userId = this.state.userId;
    const abort = new AbortController();
    this.abort = abort;
    this.patch({ status: "loading", error: null });
    try {
      const overview = await (initialize ? this.dependencies.bootstrap : this.dependencies.load)({ accessToken, signal: abort.signal });
      if (version !== this.requestVersion || this.state.mode !== "live" || userId !== this.state.userId) return;
      this.patch({ overview, status: "ready", error: null });
    } catch (error) {
      if (version !== this.requestVersion || this.state.mode !== "live" || userId !== this.state.userId) return;
      if (!initialize && error instanceof ApiError && error.status === 404 && error.backendCode === "STATE_NOT_FOUND") { this.patch({ overview: null, status: "needs_bootstrap", error: null }); return; }
      this.patch({ overview: null, status: "error", error: error instanceof ApiError ? error.message : "Could not load your saved plan. Please retry." });
      throw error;
    }
  }
  reload = () => this.request(false);
  startSamplePlan = () => this.request(true);
  useDemo = () => {
    this.choiceVersion++;
    this.invalidate();
    this.persist(MODE_KEY, "demo");
    this.patch({ mode: "demo", overview: null, status: this.dependencies.config.supabaseConfigured ? "idle" : "unconfigured", error: null });
  };
}
