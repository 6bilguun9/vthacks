"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type AccessibilityPreferences = {
  colorPalette: "hokie" | "ocean" | "berry";
  contrast: "standard" | "high";
  motion: "system" | "smooth" | "reduced";
  textScale: number;
};

const storageKey = "hokie-wallet-accessibility";
const eventName = "hokie-wallet-accessibility-change";
const defaults: AccessibilityPreferences = {
  colorPalette: "hokie",
  contrast: "standard",
  motion: "system",
  textScale: 100,
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
    const parsed = JSON.parse(snapshot) as Partial<AccessibilityPreferences> & {
      colorVision?: string;
      textSize?: string;
    };
    const textScale = typeof parsed.textScale === "number"
      ? Math.min(140, Math.max(100, Math.round(parsed.textScale / 5) * 5))
      : parsed.textSize === "large" ? 125 : 100;
    const colorPalette = parsed.colorPalette === "ocean" || parsed.colorPalette === "berry"
      ? parsed.colorPalette
      : parsed.colorVision === "color-safe" ? "ocean" : "hokie";
    return {
      colorPalette,
      contrast: parsed.contrast === "high" ? "high" : "standard",
      motion: parsed.motion === "smooth" || parsed.motion === "reduced" ? parsed.motion : "system",
      textScale,
    };
  } catch {
    return defaults;
  }
}

const palettes = [
  { id: "hokie", label: "Hokie", description: "maroon, orange, and stone", colors: ["#861f41", "#e87722", "#b9a78f"] },
  { id: "ocean", label: "Ocean", description: "blue, gold, and teal", colors: ["#0072b2", "#e69f00", "#009e73"] },
  { id: "berry", label: "Berry", description: "plum, sky, and yellow", colors: ["#8b4a83", "#56b4e9", "#f0c94a"] },
] as const;

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

        <fieldset className="accessibility-group text-scale-control">
          <div className="control-label-row">
            <legend>Text size</legend>
            <output htmlFor="text-size-slider" aria-live="polite">{preferences.textScale}%</output>
          </div>
          <input
            id="text-size-slider"
            type="range"
            min="100"
            max="140"
            step="5"
            value={preferences.textScale}
            aria-valuetext={`${preferences.textScale} percent`}
            onChange={(event) => updatePreference("textScale", Number(event.target.value))}
            style={{ "--range-progress": `${((preferences.textScale - 100) / 40) * 100}%` } as React.CSSProperties}
          />
          <div className="range-labels" aria-hidden="true"><span>Standard</span><span>Large</span></div>
        </fieldset>
        <ControlGroup label="Contrast">
          <ChoiceButton pressed={preferences.contrast === "standard"} onClick={() => updatePreference("contrast", "standard")}>Standard</ChoiceButton>
          <ChoiceButton pressed={preferences.contrast === "high"} onClick={() => updatePreference("contrast", "high")}>High contrast</ChoiceButton>
        </ControlGroup>
        <fieldset className="accessibility-group palette-control">
          <legend>Dashboard colors</legend>
          <div className="palette-options">
            {palettes.map((palette) => (
              <button
                key={palette.id}
                type="button"
                aria-pressed={preferences.colorPalette === palette.id}
                aria-label={`${palette.label}: ${palette.description}`}
                onClick={() => updatePreference("colorPalette", palette.id)}
              >
                <span className="palette-swatches" aria-hidden="true">
                  {palette.colors.map((color) => <i key={color} style={{ background: color }} />)}
                </span>
                <span>{palette.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <ControlGroup
          label="Motion"
          columns={3}
          description="System follows your device and may match Reduced. Smooth always plays the tab transitions. Reduced switches instantly."
        >
          <ChoiceButton pressed={preferences.motion === "system"} onClick={() => updatePreference("motion", "system")}>System</ChoiceButton>
          <ChoiceButton pressed={preferences.motion === "smooth"} onClick={() => updatePreference("motion", "smooth")}>Smooth</ChoiceButton>
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

function ControlGroup({
  children,
  columns = 2,
  description,
  label,
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
  description?: string;
  label: string;
}) {
  return (
    <fieldset className="accessibility-group">
      <legend>{label}</legend>
      <div style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>{children}</div>
      {description && <p className="control-description">{description}</p>}
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
