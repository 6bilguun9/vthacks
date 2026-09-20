"use client";

import { useMemo, useSyncExternalStore } from "react";
import { notificationReducer, readNotifications, sampleNotifications, type NotificationAction, type WalletNotification } from "./notification-state";

const storageKey = "hokie-wallet-notifications-v1";
const eventName = "hokie-wallet-notifications-change";
const initialSnapshot = JSON.stringify(sampleNotifications);
let memorySnapshot = initialSnapshot;
let memoryOnly = false;

function getSnapshot() {
  if (memoryOnly) return memorySnapshot;
  try { return localStorage.getItem(storageKey) ?? memorySnapshot; } catch { return memorySnapshot; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(eventName, callback); };
}
function dispatch(action: NotificationAction) {
  if (typeof window === "undefined") return;
  memorySnapshot = JSON.stringify(notificationReducer(readNotifications(getSnapshot()), action));
  try { localStorage.setItem(storageKey, memorySnapshot); } catch { memoryOnly = true; }
  window.dispatchEvent(new Event(eventName));
}

// Backend-connected goal/save handlers can publish here after a successful change.
// Reuse an id to replace a previous update (for example, a text-size slider).
export function publishNotification(item: Omit<WalletNotification, "createdAt" | "read">) {
  dispatch({ type: "publish", item: { ...item, createdAt: new Date().getTime(), read: false } });
}

export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => initialSnapshot);
  const items = useMemo(() => readNotifications(snapshot), [snapshot]);
  return { items, markRead: (id: string) => dispatch({ type: "read", id }), markAllRead: () => dispatch({ type: "read-all" }) };
}
