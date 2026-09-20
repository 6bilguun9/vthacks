import { describe, expect, it } from "vitest";
import { presentationScenes, totalPresentationSeconds } from "../src/features/presentation/presentation-content";
import { formatPresentationTime, initialPlayback, playbackReducer } from "../src/features/presentation/playback";

describe("presentation playback", () => {
  it("hands off to the next scene exactly at each boundary", () => {
    const playing = playbackReducer(initialPlayback, { type: "play", now: 1000 });

    for (let index = 1; index < presentationScenes.length; index += 1) {
      const boundary = presentationScenes[index]!.startsAt * 1000 + 1000;
      expect(playbackReducer(playing, { type: "tick", now: boundary - 1 }).index).toBe(index - 1);
      expect(playbackReducer(playing, { type: "tick", now: boundary }).index).toBe(index);
    }
  });

  it("settles the clock when paused and excludes paused time on resume", () => {
    const playing = playbackReducer(initialPlayback, { type: "play", now: 1000 });
    const paused = playbackReducer(playing, { type: "pause", now: 17250 });
    expect(paused).toMatchObject({ elapsed: 16.25, index: 1, running: false, startedAt: null });
    expect(playbackReducer(paused, { type: "tick", now: 100000 })).toEqual(paused);

    const resumed = playbackReducer(paused, { type: "play", now: 101000 });
    const afterResume = playbackReducer(resumed, { type: "tick", now: 104000 });
    expect(afterResume.elapsed).toBe(19.25);
    expect(afterResume.running).toBe(true);
  });

  it("skips stale frames without extending the four-minute presentation", () => {
    const playing = playbackReducer(initialPlayback, { type: "play", now: 5000 });
    const delayed = playbackReducer(playing, { type: "tick", now: 185000 });
    expect(delayed).toMatchObject({ elapsed: 180, index: 7, running: true });

    const ended = playbackReducer(delayed, { type: "tick", now: 999000 });
    expect(ended).toMatchObject({
      elapsed: totalPresentationSeconds,
      index: presentationScenes.length - 1,
      running: false,
      startedAt: null,
    });
    expect(playbackReducer(ended, { type: "tick", now: 1000000 })).toEqual(ended);
    expect(playbackReducer(ended, { type: "play", now: 1001000 })).toMatchObject({
      elapsed: 0, index: 0, running: true, startedAt: 1001000, anchorElapsed: 0,
    });
  });

  it("ends at exactly 4:00 even when pause is the final clock update", () => {
    const playing = playbackReducer(initialPlayback, { type: "play", now: 0 });
    expect(playbackReducer(playing, { type: "tick", now: 240000 })).toMatchObject({
      elapsed: 240, running: false,
    });
    expect(playbackReducer(playing, { type: "pause", now: 241000 })).toMatchObject({
      elapsed: 240, running: false, startedAt: null, anchorElapsed: 240,
    });
  });

  it("seeks to a scene while stopping autoplay, then resets all timing", () => {
    const playing = playbackReducer(initialPlayback, { type: "play", now: 1000 });
    const sought = playbackReducer(playing, { type: "seek", index: 5 });
    expect(sought).toEqual({
      index: 5, elapsed: 120, running: false, startedAt: null, anchorElapsed: 120,
    });
    expect(playbackReducer(sought, { type: "tick", now: 500000 })).toEqual(sought);
    expect(playbackReducer(sought, { type: "reset" })).toEqual(initialPlayback);
    expect(playbackReducer(sought, { type: "seek", index: -1 }).index).toBe(0);
    expect(playbackReducer(sought, { type: "seek", index: 100 }).index).toBe(presentationScenes.length - 1);
  });

  it("ignores repeated play actions instead of restarting the timer", () => {
    const playing = playbackReducer(initialPlayback, { type: "play", now: 1000 });
    const repeated = playbackReducer(playing, { type: "play", now: 9000 });
    expect(playbackReducer(repeated, { type: "tick", now: 16000 }).elapsed).toBe(15);
  });

  it("formats the talk timer without rounding ahead", () => {
    expect(formatPresentationTime(0)).toBe("0:00");
    expect(formatPresentationTime(59.99)).toBe("0:59");
    expect(formatPresentationTime(60)).toBe("1:00");
    expect(formatPresentationTime(240)).toBe("4:00");
    expect(formatPresentationTime(-1)).toBe("0:00");
  });
});
