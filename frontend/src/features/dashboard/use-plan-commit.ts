"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { commitPlan } from "@/lib/api";
import { useFinancialSession } from "@/features/session/financial-session";
import { PlanCommitStore, type PlanCommitState } from "./plan-commit-store";

const serverState: PlanCommitState = { pending: null, busy: false, message: "", ready: false };

export function usePlanCommit() {
  const { userId, mode, getAccessToken, reload } = useFinancialSession();
  const store = useMemo(() => new PlanCommitStore({
    userId: mode === "live" ? userId : null, getAccessToken, reload,
    storage: () => window.sessionStorage, newKey: () => crypto.randomUUID(), commit: commitPlan,
  }), [userId, mode, getAccessToken, reload]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverState);
  useEffect(() => store.start(), [store]);
  return { ...state, save: store.save };
}
