"use client";

import { useSyncExternalStore } from "react";

export type DashboardTheme = "dark" | "light";

const storageKey = "hokie-wallet-theme";
const eventName = "wallet-theme";
let temporaryTheme: DashboardTheme | null = null;

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}

function getSnapshot(): DashboardTheme {
  let saved: string | null = temporaryTheme;
  try {
    saved = localStorage.getItem(storageKey) ?? saved;
  } catch {
    // The device preference remains available when storage is disabled.
  }
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useDashboardTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as DashboardTheme);

  function toggleTheme() {
    temporaryTheme = theme === "light" ? "dark" : "light";
    try {
      localStorage.setItem(storageKey, temporaryTheme);
    } catch {
      // Keep the in-memory preference for this session.
    }
    window.dispatchEvent(new Event(eventName));
  }

  return { theme, toggleTheme };
}
