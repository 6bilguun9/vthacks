"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, manualRequestSchema, updateManualData, type OverviewResponse } from "@/lib/api";
import { useFinancialSession } from "@/features/session/financial-session";
import { centsInput, displayDate, dollarsToCents } from "./live-inputs";
import { LiveField } from "./plan-workspace";

function localTimestamp(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function asOf(value: string, previous: string) {
  if (value === localTimestamp(previous)) return previous;
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error("Add the date and time when you checked each balance or charge.");
  if (date.getTime() > Date.now()) throw new Error("A balance or charge cannot be checked in the future.");
  return date.toISOString();
}

export function ManualDataForm({ overview, onSaved, disabled }: { overview: OverviewResponse; onSaved: () => Promise<void>; disabled: boolean }) {
  const { getAccessToken } = useFinancialSession();
  const [balances, setBalances] = useState(overview.snapshot.campusBalances);
  const [charges, setCharges] = useState(overview.snapshot.universityCharges);
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const locked = disabled || busy || needsReload;
  const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || pending.current) return;
    const data = new FormData(event.currentTarget);
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setMessage("");
    let sent = false;
    let saved = false;
    try {
      const request = manualRequestSchema.parse({
        expectedVersion: overview.plan.version,
        snapshotId: overview.snapshot.id,
        campusBalances: balances.map((balance, i) => ({
          id: balance.id, name: value(data, `balance${i}.name`),
          balanceCents: dollarsToCents(value(data, `balance${i}.amount`)),
          restriction: value(data, `balance${i}.restriction`),
          asOf: asOf(value(data, `balance${i}.checked`), balance.source.asOf),
        })),
        universityCharges: charges.map((charge, i) => ({
          id: charge.id, name: value(data, `charge${i}.name`),
          amountCents: dollarsToCents(value(data, `charge${i}.amount`)),
          dueDate: value(data, `charge${i}.due`) || null,
          fundingGoalId: value(data, `charge${i}.goal`) || null,
          asOf: asOf(value(data, `charge${i}.checked`), charge.source.asOf),
        })),
      });
      const accessToken = await getAccessToken();
      if (controller.signal.aborted) return;
      sent = true;
      await updateManualData(request, { accessToken, signal: controller.signal });
      if (controller.signal.aborted) return;
      saved = true;
      setNeedsReload(true);
      setMessage("Campus data was saved. Reloading your plan…");
      await onSaved();
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (saved) {
        setNeedsReload(true);
        setMessage("Your campus data was saved, but the updated view could not load. Reload before editing again.");
      } else if (cause instanceof ApiError && cause.status === 409) {
        setNeedsReload(true);
        setMessage("Your plan changed since you opened these entries. Reload the saved plan, then review your edits before saving again.");
      } else if (sent && (!(cause instanceof ApiError) || cause.status === undefined || cause.status >= 500)) {
        setNeedsReload(true);
        setMessage("The save could not be confirmed. It may have completed. Reload and review the saved entries before making another change.");
      } else {
        setMessage(cause instanceof Error ? cause.message : "Campus data could not be saved.");
      }
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }

  async function reloadSaved() {
    if (busy) return;
    setBusy(true);
    try {
      await onSaved();
      // A failed write can leave the same revision. Discard that unsaved draft on reload too.
      setBalances(overview.snapshot.campusBalances);
      setCharges(overview.snapshot.universityCharges);
      formRef.current?.reset();
      setNeedsReload(false);
      setMessage("Saved plan reloaded. Review the entries before changing them.");
    }
    catch { setMessage("The saved plan could not load. Keep these edits paused and try Reload again."); }
    finally { setBusy(false); }
  }

  return <div className="live-manual-editor">
    <p>Enter current campus balances and university charges. Campus funds are restricted; they never increase your spendable bank cash. Removing an entry takes effect only when you choose Save campus data.</p>
    <form ref={formRef} onSubmit={save}>
      <fieldset disabled={locked}>
        <legend>Campus balances</legend>
        <div className="live-editor-heading"><h3>Dining and Hokie Passport</h3><button type="button" className="live-secondary" disabled={balances.length >= 20} onClick={() => setBalances([...balances, { id: crypto.randomUUID(), name: "", balanceCents: 0, restriction: "Campus purchases only; not bank cash", source: { kind: "manual", asOf: new Date().toISOString(), fetchedAt: null, isStale: false } }])}>Add campus balance</button></div>
        {balances.length === 0 && <p className="live-caption">No campus balances entered.</p>}
        {balances.map((balance, i) => <div className="live-editor-row" key={balance.id}>
          <div className="live-form-grid">
            <LiveField label="Balance name"><input name={`balance${i}.name`} defaultValue={balance.name} maxLength={100} required /></LiveField>
            <LiveField label="Current balance ($)"><input name={`balance${i}.amount`} type="number" min="0" step="0.01" defaultValue={centsInput(balance.balanceCents)} required /></LiveField>
            <LiveField label="Where can these funds be used?"><input name={`balance${i}.restriction`} defaultValue={balance.restriction} maxLength={200} required /></LiveField>
            <LiveField label="Balance checked at (your local time)"><input name={`balance${i}.checked`} type="datetime-local" defaultValue={localTimestamp(balance.source.asOf)} required /></LiveField>
          </div>
          <p className="live-caption">Last recorded: {displayDate(balance.source.asOf)} · {balance.source.kind === "fixture" ? "Synthetic sample" : "Manually entered"}.</p>
          <button type="button" className="live-text-button" onClick={() => setBalances(balances.filter((item) => item.id !== balance.id))}>Remove this balance from proposed data</button>
        </div>)}
        <div className="live-editor-heading"><h3>University charges</h3><button type="button" className="live-secondary" disabled={charges.length >= 100} onClick={() => setCharges([...charges, { id: crypto.randomUUID(), name: "", amountCents: 0, dueDate: null, fundingGoalId: null, source: { kind: "manual", asOf: new Date().toISOString(), fetchedAt: null, isStale: false } }])}>Add university charge</button></div>
        <p className="live-caption">Include tuition and university charges here once. If a savings goal covers a charge, select it so the backend can account for the funding relationship.</p>
        {charges.length === 0 && <p className="live-caption">No university charges entered.</p>}
        {charges.map((charge, i) => <div className="live-editor-row" key={charge.id}>
          <div className="live-form-grid">
            <LiveField label="Charge name"><input name={`charge${i}.name`} defaultValue={charge.name} maxLength={100} required /></LiveField>
            <LiveField label="Amount due ($)"><input name={`charge${i}.amount`} type="number" min="0" step="0.01" defaultValue={centsInput(charge.amountCents)} required /></LiveField>
            <LiveField label="Due date (leave blank if unknown)"><input name={`charge${i}.due`} type="date" defaultValue={charge.dueDate ?? ""} /></LiveField>
            <LiveField label="Goal funding this charge"><select name={`charge${i}.goal`} defaultValue={charge.fundingGoalId ?? ""}>
              <option value="">No linked goal</option>
              {charge.fundingGoalId && !overview.plan.goals.some((goal) => goal.id === charge.fundingGoalId) && <option value={charge.fundingGoalId}>Previously linked goal</option>}
              {overview.plan.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
            </select></LiveField>
            <LiveField label="Charge checked at (your local time)"><input name={`charge${i}.checked`} type="datetime-local" defaultValue={localTimestamp(charge.source.asOf)} required /></LiveField>
          </div>
          <p className="live-caption">Last recorded: {displayDate(charge.source.asOf)} · {charge.source.kind === "fixture" ? "Synthetic sample" : "Manually entered"}.</p>
          <button type="button" className="live-text-button" onClick={() => setCharges(charges.filter((item) => item.id !== charge.id))}>Remove this charge from proposed data</button>
        </div>)}
        <button type="submit" className="live-primary">{busy ? "Saving campus data…" : "Save campus data"}</button>
      </fieldset>
    </form>
    {message && <p className={needsReload ? "live-error" : "live-caption"} role="status">{message}</p>}
    {needsReload && <button type="button" className="live-secondary" disabled={busy} onClick={() => void reloadSaved()}>Reload saved plan</button>}
  </div>;
}
