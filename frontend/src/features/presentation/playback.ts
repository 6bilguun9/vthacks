import { presentationScenes, totalPresentationSeconds } from "./presentation-content";

export type PlaybackState = {
  index: number;
  elapsed: number;
  running: boolean;
  startedAt: number | null;
  anchorElapsed: number;
};

export type PlaybackAction =
  | { type: "play"; now: number }
  | { type: "pause"; now: number }
  | { type: "tick"; now: number }
  | { type: "seek"; index: number }
  | { type: "reset" };

export const initialPlayback: PlaybackState = {
  index: 0,
  elapsed: 0,
  running: false,
  startedAt: null,
  anchorElapsed: 0,
};

function sceneAt(elapsed: number): number {
  let index = 0;
  for (let candidate = 0; candidate < presentationScenes.length; candidate += 1) {
    if (elapsed >= presentationScenes[candidate]!.startsAt) index = candidate;
    else break;
  }
  return index;
}

function settle(state: PlaybackState, now: number): PlaybackState {
  if (!state.running || state.startedAt === null) return state;

  // Anchor to the clock so background tabs and delayed frames do not slow the talk.
  const elapsed = Math.min(
    totalPresentationSeconds,
    state.anchorElapsed + Math.max(0, now - state.startedAt) / 1000,
  );
  const finished = elapsed >= totalPresentationSeconds;

  return {
    ...state,
    elapsed,
    index: sceneAt(elapsed),
    running: !finished,
    startedAt: finished ? null : state.startedAt,
    anchorElapsed: finished ? elapsed : state.anchorElapsed,
  };
}

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "play": {
      if (state.running) return state;
      const next = state.elapsed >= totalPresentationSeconds ? initialPlayback : state;
      return { ...next, running: true, startedAt: action.now, anchorElapsed: next.elapsed };
    }
    case "pause": {
      const next = settle(state, action.now);
      return { ...next, running: false, startedAt: null, anchorElapsed: next.elapsed };
    }
    case "tick":
      return settle(state, action.now);
    case "seek": {
      const index = Math.min(presentationScenes.length - 1, Math.max(0, Math.trunc(action.index)));
      const elapsed = presentationScenes[index]!.startsAt;
      return { index, elapsed, running: false, startedAt: null, anchorElapsed: elapsed };
    }
    case "reset":
      return { ...initialPlayback };
  }
}

export function formatPresentationTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}
