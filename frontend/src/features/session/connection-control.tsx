"use client";

import { useId, useState } from "react";
import { Cable, Check, Copy, ShieldCheck } from "lucide-react";
import { useFinancialSession } from "./financial-session";
import { GuestVerification } from "./turnstile";
import "./session.css";

export function ConnectionControl({ className = "" }: { className?: string }) {
  const session = useFinancialSession();
  const [open, setOpen] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const id = useId();
  const busy = session.status === "connecting" || session.status === "loading";
  const needsVerification = !session.userId;
  const live = session.mode === "live";
  async function connect() {
    try { await session.connect(captchaToken ?? undefined); }
    catch { setCaptchaToken(null); setVerificationAttempt(value => value + 1); }
  }
  async function copyId() {
    if (!session.userId) return;
    try { await navigator.clipboard.writeText(session.userId); setCopyMessage("Guest ID copied."); }
    catch { setCopyMessage("Select and copy the guest ID below."); }
  }
  return <details className={`session-control ${className}`} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="session-trigger"><Cable size={15} aria-hidden="true" />{live ? "Sandbox session" : "Connect sandbox"}{live && session.status === "ready" && <Check size={14} aria-label="Connected" />}</summary>
    <section className="session-panel" aria-labelledby={id}>
      <div className="session-panel-title"><ShieldCheck size={20} aria-hidden="true" /><h2 id={id}>{live ? "Your private sandbox" : "Try the connected planner"}</h2></div>
      <p>Connect a guest session to use the backend planner. Banking data comes from a sandbox; this does not connect your real bank account.</p>
      {!session.config.supabaseConfigured ? <div className="session-setup"><strong>Connection setup is needed</strong><p>Add the project’s public Supabase URL and publishable key to this app, then restart it. The dashboard demo remains available.</p><details><summary>Setup details for your team</summary><p>Use <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, and <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> from the frontend environment template. Enable anonymous sign-ins and CAPTCHA in Supabase. Never use a secret or service key here.</p></details></div> : <>
        {session.userId && <div className="session-guest"><span>Guest ID</span><code>{session.userId}</code><button type="button" onClick={() => void copyId()}><Copy size={14} aria-hidden="true" />Copy ID</button><small>Share this ID with your team if they need to enable presenter access. It is not your session token.</small><span role="status">{copyMessage}</span></div>}
        {needsVerification && <><p className="session-small">Your plan stays with this browser. Keep its guest session to retain access.</p>{session.config.turnstileSiteKey ? open && <GuestVerification key={verificationAttempt} siteKey={session.config.turnstileSiteKey} onToken={setCaptchaToken} /> : <p className="session-inline-message">Guest verification needs the team’s public Turnstile site key before a new session can be created.</p>}</>}
        {session.status === "needs_bootstrap" && <div className="session-setup"><strong>Start with a sample plan</strong><p>This guest has no plan yet. Create a clearly labeled synthetic profile, then edit its balances and goals. Nothing is connected to a real bank.</p><button type="button" className="session-primary" onClick={() => void session.startSamplePlan().catch(() => {})}>Create my sample plan</button></div>}
        <div className="session-actions">
          {session.status !== "needs_bootstrap" && <button type="button" className="session-primary" disabled={busy || (needsVerification && !captchaToken)} onClick={() => void connect()}>{busy ? "Connecting…" : live && session.status === "ready" ? "Refresh saved plan" : session.userId ? "Resume my session" : "Connect securely"}</button>}
        </div>
      </>}
      {live && <div className="session-actions"><button type="button" onClick={session.useDemo}>Use dashboard demo</button></div>}
      {session.error && <p className="session-inline-message" role="alert">{session.error}</p>}
      <p className="session-small" role="status">{live && session.status === "ready" ? "Connected. Changes are saved only when you confirm them." : busy ? "Loading your guest plan…" : live ? "Your live session will never silently switch to sample results." : "You are viewing the dashboard demo."}</p>
    </section>
  </details>;
}
