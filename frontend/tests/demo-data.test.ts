import { describe, expect, it } from "vitest";
import { demoData, demoSummary, formatMoney } from "../src/features/dashboard/demo-data";

describe("synthetic dashboard money", () => {
  it("stores every monetary field as safe integer cents", () => {
    function check(value: unknown) {
      if (typeof value !== "object" || value === null) return;
      for (const [key, child] of Object.entries(value)) {
        if (key.endsWith("Cents")) expect(Number.isSafeInteger(child)).toBe(true);
        else check(child);
      }
    }
    check(demoData);
    check(demoSummary);
  });

  it("keeps fixed sample summaries consistent without replaying transaction history", () => {
    expect(demoData.spending.reduce((sum, item) => sum + item.amountCents, 0)).toBe(demoSummary.totalSpentCents);
    expect(demoData.monthlyBudgetCents - demoSummary.totalSpentCents).toBe(demoSummary.budgetRemainingCents);
    expect(demoData.savingsGoal.targetCents - demoData.savingsGoal.savedCents).toBe(demoSummary.savingsRemainingCents);
    expect(demoData.savingsGoal.savedCents).toBeLessThanOrEqual(demoData.bankBalanceCents);
  });

  it("converts cents only for display, including negative transactions", () => {
    expect(formatMoney(125042)).toBe("$1,250.42");
    expect(formatMoney(-650)).toBe("-$6.50");
    expect(formatMoney(1)).toBe("$0.01");
    expect(() => formatMoney(1.5)).toThrow(RangeError);
  });
});
