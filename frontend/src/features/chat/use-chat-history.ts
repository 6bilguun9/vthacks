"use client";

import { useMemo, useSyncExternalStore } from "react";
import { emptyHistory, historyReducer, readHistory, type HistoryAction } from "./conversation-history";

const storageKey = "hokie-wallet-finbot-chats-v1";
const changeEvent = "finbot-history-change";
const emptySnapshot = JSON.stringify(emptyHistory);
let memorySnapshot = emptySnapshot;
let memoryOnly = false;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(changeEvent, callback);
  };
}
function getSnapshot() {
  if (memoryOnly) return memorySnapshot;
  try { return localStorage.getItem(storageKey) ?? emptySnapshot; }
  catch { return memorySnapshot; }
}
const subscribeReady = () => () => {};

export function useChatHistory() {
  // React subscribes to browser storage after hydration, keeping the first server render safe.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const { history, warning } = useMemo(() => readHistory(snapshot), [snapshot]);

  function dispatch(action: HistoryAction) {
    const next = historyReducer(readHistory(getSnapshot()).history, action);
    memorySnapshot = JSON.stringify(next);
    try {
      localStorage.setItem(storageKey, memorySnapshot);
      memoryOnly = false;
    } catch {
      memoryOnly = true;
    }
    window.dispatchEvent(new Event(changeEvent));
  }

  return { history, dispatch, ready, warning: memoryOnly ? "Browser storage is unavailable. Chats will last only for this visit." : warning };
}
