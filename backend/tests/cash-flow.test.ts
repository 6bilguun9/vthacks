import { describe, expect, it } from "vitest";
import { simulateCashFlow, type CashFlowSimulationInput } from "../src/finance/cash-flow.js";

const septemberPlan: CashFlowSimulationInput = {
  asOfDate: "2026-09-01",
  horizonEndDate: "2026-09-07",
  startingEligibleCashCents: 10_000,
  cashBufferCents: 5_000,
  flows: [
    { id: "rent", kind: "essential_expense", amountCents: 8_000, cadence: "once", nextDate: "2026-09-02" },
    { id: "paycheck", kind: "income", amountCents: 10_000, cadence: "once", nextDate: "2026-09-05" },
  ],
};

describe("simulateCashFlow", () => {
  it("protects the buffer when an essential bill is due before income", () => {
    const result = simulateCashFlow(septemberPlan);

    expect(result).toMatchObject({
      status: "buffer_breached",
      endingEligibleCashCents: 12_000,
      minimumEligibleCashCents: 2_000,
      minimumAvailableAfterBufferCents: -3_000,
      firstBufferBreach: { date: "2026-09-02", eventId: "rent", availableAfterBufferCents: -3_000 },
    });
    expect(result.events.map((event) => [event.id, event.deltaCents, event.balanceAfterCents])).toEqual([
      ["rent", -8_000, 2_000],
      ["paycheck", 10_000, 12_000],
    ]);
  });

  it("discloses and consistently uses income-before-expense ordering on the same date", () => {
    const result = simulateCashFlow({
      ...septemberPlan,
      asOfDate: "2026-09-02",
      horizonEndDate: "2026-09-02",
      startingEligibleCashCents: 4_000,
      cashBufferCents: 0,
      flows: [
        { id: "rent", kind: "essential_expense", amountCents: 8_000, cadence: "once", nextDate: "2026-09-02" },
        { id: "paycheck", kind: "income", amountCents: 5_000, cadence: "once", nextDate: "2026-09-02" },
      ],
    });

    expect(result).toMatchObject({ status: "feasible", sameDayOrdering: "income_before_outflows", endingEligibleCashCents: 1_000 });
    expect(result.events.map((event) => event.id)).toEqual(["paycheck", "rent"]);
  });

  it("keeps a monthly schedule anchored to its original day while clamping short months", () => {
    const result = simulateCashFlow({
      asOfDate: "2026-01-01",
      horizonEndDate: "2026-04-01",
      startingEligibleCashCents: 50_000,
      cashBufferCents: 0,
      flows: [{ id: "phone", kind: "essential_expense", amountCents: 100, cadence: "monthly", nextDate: "2026-01-31" }],
    });

    expect(result.events.map((event) => event.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("advances old recurring schedules to their first upcoming occurrence and honors an end date", () => {
    const result = simulateCashFlow({
      asOfDate: "2026-02-10",
      horizonEndDate: "2026-05-31",
      startingEligibleCashCents: 10_000,
      cashBufferCents: 0,
      flows: [{ id: "stipend", kind: "income", amountCents: 500, cadence: "monthly", nextDate: "2026-01-31", endDate: "2026-03-31" }],
    });

    expect(result.events.map((event) => event.date)).toEqual(["2026-02-28", "2026-03-31"]);
  });

  it("flags a buffer that is already not funded before any future event", () => {
    const result = simulateCashFlow({ ...septemberPlan, startingEligibleCashCents: 2_000, cashBufferCents: 5_000, flows: [] });

    expect(result).toMatchObject({
      status: "buffer_breached",
      events: [],
      firstBufferBreach: { date: "2026-09-01", eventId: null, availableAfterBufferCents: -3_000 },
    });
  });

  it("rejects ambiguous duplicate cash-flow identifiers", () => {
    expect(() => simulateCashFlow({
      ...septemberPlan,
      flows: [
        { id: "same", kind: "income", amountCents: 100, cadence: "once", nextDate: "2026-09-01" },
        { id: "same", kind: "essential_expense", amountCents: 100, cadence: "once", nextDate: "2026-09-02" },
      ],
    })).toThrow("must be unique");
  });
});
