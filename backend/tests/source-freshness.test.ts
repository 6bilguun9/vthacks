import { describe, expect, it } from "vitest";
import { assessSourceFreshness } from "../src/services/source-freshness.js";

const source = { kind: "nessie_sandbox" as const, asOf: "2026-09-19T19:00:00-04:00", fetchedAt: "2026-09-19T19:01:00-04:00", isStale: false };

describe("assessSourceFreshness", () => {
  it("marks recent provider data fresh from its fetched timestamp", () => {
    expect(assessSourceFreshness(source, "2026-09-19T19:06:00-04:00", 10 * 60_000))
      .toEqual({ status: "fresh", referenceTimestamp: source.fetchedAt, ageMs: 5 * 60_000, reason: "within_max_age" });
  });

  it("preserves an explicit stale signal even when its timestamp is recent", () => {
    expect(assessSourceFreshness({ ...source, isStale: true }, "2026-09-19T19:02:00-04:00", 10 * 60_000))
      .toMatchObject({ status: "stale", reason: "source_marked_stale" });
  });

  it("uses asOf for a manual source that has no provider fetch timestamp", () => {
    const result = assessSourceFreshness({ kind: "manual", asOf: "2026-09-19T19:00:00-04:00", fetchedAt: null, isStale: false }, "2026-09-19T19:15:00-04:00", 10 * 60_000);
    expect(result).toEqual({ status: "stale", referenceTimestamp: "2026-09-19T19:00:00-04:00", ageMs: 15 * 60_000, reason: "exceeds_max_age" });
  });

  it("does not call future-dated data fresh", () => {
    expect(assessSourceFreshness(source, "2026-09-19T19:00:00-04:00", 10 * 60_000))
      .toMatchObject({ status: "unknown", reason: "future_timestamp" });
  });
});
