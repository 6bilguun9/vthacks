"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { bootstrapSession, getOverview } from "@/lib/api";
import { FinancialSessionController, type FinancialSessionState, type SessionConfig } from "./session-controller";
import { validPublicSupabaseConfig } from "./public-config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined;
const config: SessionConfig = { supabaseConfigured: validPublicSupabaseConfig(url, publishableKey), turnstileSiteKey };
let browserClient: SupabaseClient | null = null;
function getBrowserAuth() {
  if (typeof window === "undefined" || !config.supabaseConfigured) return null;
  try {
    browserClient ??= createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    return browserClient.auth;
  } catch { return null; }
}
function browserStorage() { try { return typeof window === "undefined" ? undefined : window.localStorage; } catch { return undefined; } }
export type FinancialSession = FinancialSessionState & {
  config: SessionConfig;
  getAccessToken(): Promise<string>;
  connect(captchaToken?: string): Promise<void>;
  startSamplePlan(): Promise<void>;
  reload(): Promise<void>;
  useDemo(): void;
};
const Context = createContext<FinancialSession | null>(null);

export function FinancialSessionProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new FinancialSessionController({ auth: getBrowserAuth(), config, storage: browserStorage(), load: getOverview, bootstrap: bootstrapSession }));
  const [initialState] = useState(controller.getSnapshot);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => initialState);
  useEffect(() => controller.start(), [controller]);
  return <Context.Provider value={{ ...state, config, getAccessToken: controller.getAccessToken, connect: controller.connect, startSamplePlan: controller.startSamplePlan, reload: controller.reload, useDemo: controller.useDemo }}>{children}</Context.Provider>;
}

export function useFinancialSession() {
  const value = useContext(Context);
  if (!value) throw new Error("FinancialSessionProvider is required.");
  return value;
}
