"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { createDiningPlan, type DiningPlanResponse } from "@/lib/api";
import { useFinancialSession } from "@/features/session/financial-session";
import { liveRequestError } from "@/features/chat/live-chat";
import { diningInput } from "./dining-input";
import { MealCalendar } from "./meal-calendar";

export function DiningPlanner() {
  const { mode, userId, overview } = useFinancialSession();
  return <GuestDiningPlanner key={`${mode}:${userId ?? "disconnected"}:${overview?.snapshot.id ?? "none"}:${overview?.plan.version ?? 0}`} />;
}

function GuestDiningPlanner() {
  const session = useFinancialSession();
  const [plan, setPlan] = useState<DiningPlanResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const ready = session.mode === "live" && session.status === "ready" && session.overview?.capabilities?.ai === true;

  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);

  function invalidateResult() {
    pending.current?.abort();
    pending.current = null;
    setLoading(false);
    setPlan(null);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || pending.current) return;
    const data = new FormData(event.currentTarget);
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setError(""); setPlan(null);
    try {
      const input = diningInput(data);
      const accessToken = await session.getAccessToken();
      if (controller.signal.aborted) return;
      const result = await createDiningPlan(input, { accessToken, signal: controller.signal });
      if (pending.current === controller && !controller.signal.aborted) setPlan(result);
    } catch (cause) {
      if (pending.current === controller && !controller.signal.aborted) setError(liveRequestError(cause, "dining"));
    } finally {
      if (pending.current === controller) { pending.current = null; setLoading(false); }
    }
  }

  return <>
    <form onSubmit={submit} onChange={invalidateResult} className="dining-form border bg-card">
      <p className="mb-5 text-sm leading-6" role="status">{session.mode === "demo" ? "Connect a guest plan using the control above to request a live meal calendar, or explore the separate sample below." : session.status !== "ready" ? "Load your guest plan before requesting a meal calendar." : ready ? "Live AI request · Enter your current campus balances below. These restricted funds stay separate from bank cash." : "Live AI is limited to an approved presenter guest. Ask the backend team to enable this guest, or view the labeled sample."}</p>
      <div className="dining-fields grid gap-5">
        <Field label="Dining plan"><select name="diningPlan" defaultValue="Unlimited">{["Unlimited", "Unlimited Plus", "Maroon", "Maroon Plus", "Orange", "Orange Plus", "Dining Dollars only"].map((name) => <option key={name}>{name}</option>)}</select></Field>
        <Field label="Student status"><select name="studentStatus"><option>First-year, on campus</option><option>Upper-year, on campus</option><option>Off campus</option></select></Field>
        <Field label="Current dining balance ($)"><input name="diningBalance" type="number" min="0" step="0.01" placeholder="Enter current balance" required /></Field>
        <Field label="Current Hokie Passport balance ($)"><input name="hokiePassportBalance" type="number" min="0" step="0.01" defaultValue="0" required /></Field>
        <Field label="Weeks remaining"><input name="weeksRemaining" type="number" min="1" max="36" placeholder="Weeks left in the term" required /></Field>
      </div>
      <Field label="Preferences, dietary needs, and schedule" wide><textarea name="preferences" minLength={3} maxLength={2000} required placeholder="Vegetarian, peanut allergy, early classes M/W/F, quick breakfasts…" /></Field>
      <label className="dining-fallback mt-4 flex items-center gap-3 text-sm"><input className="size-4" type="checkbox" name="allowHokiePassport" /> Allow Hokie Passport funds as a fallback</label>
      <div className="dining-actions mt-6 flex flex-wrap items-center gap-4">
        <button disabled={!ready || loading} className="dining-submit inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60">{loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarDays className="size-4" aria-hidden="true" />}{loading ? "Building your week…" : "Create meal calendar"}</button>
        <Link href="/demo" className="dining-demo-link text-sm font-semibold text-primary underline">View sample calendar</Link>
      </div>
      <p className="mt-4 text-sm leading-6">This is a planning estimate, not a reservation or purchase. Confirm dietary and allergy information with the dining location.</p>
      {loading && <p role="status" className="mt-4 text-sm">Your guest request is being processed. Changing the form cancels it.</p>}
      {error && <p role="alert" className="mt-5 rounded-lg border border-current p-3 text-sm font-medium">{error}</p>}
    </form>
    {plan && <MealCalendar plan={plan} />}
  </>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`dining-field flex flex-col gap-2 ${wide ? "mt-5" : ""}`}><span>{label}</span>{children}</label>;
}
