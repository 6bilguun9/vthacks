import { describe, expect, it } from "vitest";
import { getDemoReply, suggestedQuestions } from "../src/features/chat/demo-replies";
import { demoChatExamples, demoData, demoSummary, formatMoney } from "../src/features/dashboard/demo-data";

describe("FinBot scripted replies", () => {
  it("answers a spending question with the dashboard's monthly totals and categories", () => {
    const reply = getDemoReply("What have I spent this month?");
    expect(reply).toContain(`${demoData.month} ${demoData.year}`);
    expect(reply).toContain(formatMoney(demoSummary.totalSpentCents));
    expect(reply).toContain(formatMoney(demoData.monthlyBudgetCents));
    expect(reply).toContain(formatMoney(demoSummary.budgetRemainingCents));
    for (const category of demoData.spending) {
      expect(reply).toContain(category.name);
      expect(reply).toContain(formatMoney(category.amountCents));
    }
    expect(reply).toMatch(/not.*affordability/i);
  });

  it("keeps bank cash, restricted campus funds, and included goal allocations distinct", () => {
    const reply = getDemoReply("What are my balances?");
    expect(reply).toContain(formatMoney(demoData.bankBalanceCents));
    expect(reply).toContain(formatMoney(demoData.walletBalanceCents));
    expect(reply).toContain(formatMoney(demoData.savingsGoal.savedCents));
    expect(reply).toMatch(/already included in.*bank/i);
    expect(reply).toMatch(/restricted.*separate from bank cash/i);
  });

  it("uses the existing savings progress and labels the contribution plan as an illustration", () => {
    const reply = getDemoReply("How is my savings goal doing?");
    expect(reply).toContain(demoData.savingsGoal.name);
    expect(reply).toContain(formatMoney(demoData.savingsGoal.savedCents));
    expect(reply).toContain(formatMoney(demoData.savingsGoal.targetCents));
    expect(reply).toContain(formatMoney(demoSummary.savingsRemainingCents));
    expect(reply).toContain(demoSummary.savingsIllustration);
  });

  it("accepts case, whitespace, and trailing punctuation variations of a supported question", () => {
    const reply = getDemoReply("  WHAT   ARE MY BALANCES?!  ");
    expect(reply).toContain(formatMoney(demoData.bankBalanceCents));
    expect(reply).toContain(formatMoney(demoData.walletBalanceCents));
  });

  it.each([
    "Can I spend $500 from my balances?",
    "Can I afford to spend $500 this weekend and still save $500 by November?",
    "Transfer my savings to my bank account",
    " ",
  ])("does not invent a financial answer for %j", (question) => {
    expect(getDemoReply(question)).toContain("What are my balances?");
    expect(getDemoReply(question)).not.toMatch(/\$\d/);
  });

  it("keeps each original supported demo question working", () => {
    for (const example of demoChatExamples) {
      expect(getDemoReply(example.question)).toBe(example.answer);
    }
  });

  it("gives every displayed suggestion a supported sample reply", () => {
    for (const suggestion of suggestedQuestions) {
      expect(getDemoReply(suggestion.question)).toContain("Sample");
      expect(getDemoReply(suggestion.question)).toMatch(/\$\d/);
    }
  });
});
