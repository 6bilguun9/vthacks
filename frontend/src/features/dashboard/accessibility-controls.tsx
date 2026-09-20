"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type AccessibilityPreferences = {
  colorVision: "original" | "color-safe";
  contrast: "standard" | "high";
  motion: "system" | "reduced";
  textSize: "standard" | "large";
};

const storageKey = "hokie-wallet-accessibility";
const eventName = "hokie-wallet-accessibility-change";
const defaults: AccessibilityPreferences = {
  colorVision: "original",
  contrast: "standard",
  motion: "system",
  textSize: "standard",
};
const defaultSnapshot = JSON.stringify(defaults);
let fallbackSnapshot = defaultSnapshot;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(eventName, callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(storageKey) ?? fallbackSnapshot;
  } catch {
    return fallbackSnapshot;
  }
}

function parsePreferences(snapshot: string): AccessibilityPreferences {
  try {
    return { ...defaults, ...JSON.parse(snapshot) } as AccessibilityPreferences;
  } catch {
    return defaults;
  }
}

export function useAccessibilityPreferences() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => defaultSnapshot);
  const preferences = parsePreferences(snapshot);

  function updatePreference<Key extends keyof AccessibilityPreferences>(
    key: Key,
    value: AccessibilityPreferences[Key],
  ) {
    const next = JSON.stringify({ ...preferences, [key]: value });
    fallbackSnapshot = next;
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The in-memory preference still applies if storage is unavailable.
    }
    window.dispatchEvent(new Event(eventName));
  }

  return { preferences, updatePreference };
}

type AccessibilityControlsProps = {
  preferences: AccessibilityPreferences;
  readText: string;
  updatePreference: <Key extends keyof AccessibilityPreferences>(
    key: Key,
    value: AccessibilityPreferences[Key],
  ) => void;
};

export function AccessibilityControls({
  preferences,
  readText,
  updatePreference,
}: AccessibilityControlsProps) {
  const [open, setOpen] = useState(false);
  const [speechState, setSpeechState] = useState<"idle" | "speaking" | "unsupported">("idle");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) {
      setSpeechState("unsupported");
      return;
    }
    if (speechState === "speaking") {
      window.speechSynthesis.cancel();
      setSpeechState("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(readText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setSpeechState("idle");
    utterance.onerror = () => setSpeechState("idle");
    window.speechSynthesis.speak(utterance);
    setSpeechState("speaking");
  }

  return (
    <div className="accessibility-tools">
      <button
        ref={triggerRef}
        type="button"
        className="accessibility-trigger"
        aria-expanded={open}
        aria-controls="accessibility-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">◉</span> Access tools
      </button>
      <section
        id="accessibility-panel"
        className="accessibility-panel"
        aria-label="Accessibility tools"
        hidden={!open}
      >
        <div className="accessibility-panel-heading">
          <div>
            <p className="eyebrow">MAKE IT YOURS</p>
            <h2>Accessibility tools</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="accessibility-close"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label="Close accessibility tools"
          >
            ×
          </button>
        </div>

        <ControlGroup label="Text size">
          <ChoiceButton pressed={preferences.textSize === "standard"} onClick={() => updatePreference("textSize", "standard")}>Standard</ChoiceButton>
          <ChoiceButton pressed={preferences.textSize === "large"} onClick={() => updatePreference("textSize", "large")}>Large</ChoiceButton>
        </ControlGroup>
        <ControlGroup label="Contrast">
          <ChoiceButton pressed={preferences.contrast === "standard"} onClick={() => updatePreference("contrast", "standard")}>Standard</ChoiceButton>
          <ChoiceButton pressed={preferences.contrast === "high"} onClick={() => updatePreference("contrast", "high")}>High contrast</ChoiceButton>
        </ControlGroup>
        <ControlGroup label="Chart colors">
          <ChoiceButton pressed={preferences.colorVision === "original"} onClick={() => updatePreference("colorVision", "original")}>Original</ChoiceButton>
          <ChoiceButton pressed={preferences.colorVision === "color-safe"} onClick={() => updatePreference("colorVision", "color-safe")}>Color-safe</ChoiceButton>
        </ControlGroup>
        <ControlGroup label="Motion">
          <ChoiceButton pressed={preferences.motion === "system"} onClick={() => updatePreference("motion", "system")}>System</ChoiceButton>
          <ChoiceButton pressed={preferences.motion === "reduced"} onClick={() => updatePreference("motion", "reduced")}>Reduced</ChoiceButton>
        </ControlGroup>

        <button type="button" className="listen-button" onClick={toggleSpeech}>
          <span aria-hidden="true">{speechState === "speaking" ? "■" : "▶"}</span>
          {speechState === "speaking" ? "Stop reading" : "Listen to this view"}
        </button>
        <p className="speech-status" role="status" aria-live="polite">
          {speechState === "speaking" && "Reading this view aloud."}
          {speechState === "unsupported" && "Text-to-speech is not available in this browser."}
        </p>
      </section>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="accessibility-group">
      <legend>{label}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function ChoiceButton({
  children,
  onClick,
  pressed,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pressed: boolean;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}
