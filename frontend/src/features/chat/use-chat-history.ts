"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { emptyHistory, historyReducer, readHistory, type HistoryAction } from "./conversation-history";

const changeEvent = "finbot-history-change";
const emptySnapshot = JSON.stringify(emptyHistory);
const memory = new Map<string, { snapshot: string; only: boolean }>();

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEvent, callback);
  };
}
function getSnapshot(storageKey: string | null) {
  if (!storageKey) return emptySnapshot;
  const cached = memory.get(storageKey);
  if (cached?.only) return cached.snapshot;
  try { return localStorage.getItem(storageKey) ?? emptySnapshot; }
  catch { return cached?.snapshot ?? emptySnapshot; }
}
const subscribeReady = () => () => {};

export function useChatHistory(storageKey: string | null) {
  // The server snapshot is blank. Each mode/guest has a distinct browser history.
  const snapshot = useSyncExternalStore(subscribe, useCallback(() => getSnapshot(storageKey), [storageKey]), () => emptySnapshot);
  const hydrated = useSyncExternalStore(subscribeReady, () => true, () => false);
  const { history, warning } = useMemo(() => readHistory(snapshot), [snapshot]);

  function dispatch(action: HistoryAction) {
    if (!storageKey) return;
    const next = historyReducer(readHistory(getSnapshot(storageKey)).history, action);
    const serialized = JSON.stringify(next);
    try {
      localStorage.setItem(storageKey, serialized);
      memory.set(storageKey, { snapshot: serialized, only: false });
    } catch {
      memory.set(storageKey, { snapshot: serialized, only: true });
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  return { history, dispatch, ready: hydrated && storageKey !== null, warning: storageKey && memory.get(storageKey)?.only ? "Browser storage is unavailable. Chats will last only for this visit." : warning };
}
