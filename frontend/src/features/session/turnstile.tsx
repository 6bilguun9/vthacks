"use client";

import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render(container: HTMLElement, options: { sitekey: string; theme: "auto"; size: "flexible"; callback(token: string): void; "expired-callback"(): void; "error-callback"(): void }): string;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<Turnstile> | null = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error("Verification took too long to load.")); }, 15000);
    script.onload = () => { window.clearTimeout(timeout); if (window.turnstile) resolve(window.turnstile); else reject(new Error("Verification could not start.")); };
    script.onerror = () => { window.clearTimeout(timeout); script.remove(); reject(new Error("Verification could not load. Check your connection.")); };
    document.head.appendChild(script);
  }).catch(error => { scriptPromise = null; throw error; });
  return scriptPromise;
}

export function GuestVerification({ siteKey, onToken }: { siteKey: string; onToken(token: string | null): void }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let canceled = false;
    let widgetId: string | undefined;
    let api: Turnstile | undefined;
    void loadTurnstile().then(turnstile => {
      if (canceled || !container.current) return;
      api = turnstile;
      widgetId = turnstile.render(container.current, {
        sitekey: siteKey, theme: "auto", size: "flexible",
        callback: token => { setError(null); onToken(token); },
        "expired-callback": () => { onToken(null); setError("Verification expired. Please retry."); },
        "error-callback": () => { onToken(null); setError("Verification did not complete. Please retry."); },
      });
    }).catch(() => { if (!canceled) setError("Verification could not load. Check your connection and retry."); });
    return () => { canceled = true; if (widgetId !== undefined) api?.remove(widgetId); onToken(null); };
  }, [siteKey, onToken, attempt]);
  return <div className="session-verification"><div ref={container} />{error && <p role="alert">{error} <button type="button" onClick={() => { setError(null); onToken(null); setAttempt(value => value + 1); }}>Retry verification</button></p>}</div>;
}
