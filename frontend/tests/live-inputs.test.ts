import { describe, expect, it } from "vitest";
import { centsInput, displayDate, dollarsToCents, weekStart } from "../src/features/dashboard/live-inputs";

describe("financial form input conversion", () => {
  it.each([["0", 0], ["0.01", 1], ["0.29", 29], ["7.5", 750], [" 150.00 ", 15000], ["90071992547404.93", 9007199254740493], ["90071992547409.91", Number.MAX_SAFE_INTEGER]])("converts %s without floating-point rounding", (input, cents) => {
    expect(dollarsToCents(input)).toBe(cents);
    expect(dollarsToCents(centsInput(cents))).toBe(cents);
  });
  it.each(["-1", "NaN", "Infinity", "1e3", "1.001", "1,000", "", ".", "90071992547409.92"])("rejects invalid or unsupported amounts: %s", input => {
    expect(() => dollarsToCents(input)).toThrow();
  });
  it("formats small amounts and rejects invalid cent values", () => {
    expect(centsInput(1)).toBe("0.01");
    expect(centsInput(200)).toBe("2.00");
    expect(() => centsInput(-1)).toThrow();
    expect(() => centsInput(1.5)).toThrow();
  });
});

describe("planning date labels", () => {
  it.each([["2026-09-20", "2026-09-14"], ["2026-09-21", "2026-09-21"], ["2027-01-01", "2026-12-28"]])("finds the Monday for %s across week/year boundaries", (input, monday) => {
    expect(weekStart(input)).toBe(monday);
  });
  it("keeps an unknown date unknown and calendar labels independent of local timezone", () => {
    expect(displayDate(null)).toBe("Not available");
    expect(displayDate("2026-09-20")).toBe("Sep 20, 2026");
  });
});
