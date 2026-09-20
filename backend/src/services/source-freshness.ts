import type { SnapshotSourceInfo } from "./financial-snapshot.js";

export type FreshnessStatus = "fresh" | "stale" | "unknown";

export interface FreshnessAssessment {
  readonly status: FreshnessStatus;
  readonly referenceTimestamp: string | null;
  readonly ageMs: number | null;
  readonly reason: "source_marked_stale" | "within_max_age" | "exceeds_max_age" | "future_timestamp";
}

function parseOffsetTimestamp(value: string, field: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new RangeError(`${field} must be an ISO timestamp with an offset.`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new RangeError(`${field} must be a real ISO timestamp.`);
  return milliseconds;
}

/**
 * Evaluates source freshness from caller-supplied time, never a global clock.
 * Provider reads use fetchedAt when present; manual entries fall back to their
 * explicit asOf timestamp. A source explicitly marked stale always remains so.
 */
export function assessSourceFreshness(source: SnapshotSourceInfo, evaluatedAt: string, maximumAgeMs: number): FreshnessAssessment {
  if (!Number.isSafeInteger(maximumAgeMs) || maximumAgeMs < 0) throw new RangeError("maximumAgeMs must be a non-negative safe integer.");
  const now = parseOffsetTimestamp(evaluatedAt, "evaluatedAt");
  const referenceTimestamp = source.fetchedAt ?? source.asOf;
  const reference = parseOffsetTimestamp(referenceTimestamp, source.fetchedAt ? "fetchedAt" : "asOf");
  const ageMs = now - reference;
  if (ageMs < 0) return { status: "unknown", referenceTimestamp, ageMs, reason: "future_timestamp" };
  if (source.isStale) return { status: "stale", referenceTimestamp, ageMs, reason: "source_marked_stale" };
  if (ageMs > maximumAgeMs) return { status: "stale", referenceTimestamp, ageMs, reason: "exceeds_max_age" };
  return { status: "fresh", referenceTimestamp, ageMs, reason: "within_max_age" };
}
