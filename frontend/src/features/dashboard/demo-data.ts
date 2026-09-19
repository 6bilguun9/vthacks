// Synthetic, fixed September 2026 profile shared by the dashboard and scripted chat.
// All monetary fields are safe integer USD cents. Campus funds are restricted;
// the goal allocation is already included in bank cash, not an additional asset.
// Categories cover the month; transactions are only a historical preview.
export const demoData = {
  month: "September",
  year: 2026,
  bankBalanceCents: 125042,
  walletBalanceCents: 34780,
  monthlyBudgetCents: 50000,
  savingsGoal: { name: "Emergency fund", savedCents: 70000, targetCents: 100000, weeklyContributionCents: 2500 },
  spending: [
    { name: "Food & coffee", amountCents: 14250, color: "#861f41" },
    { name: "Shopping", amountCents: 8684, color: "#e87722" },
    { name: "Transportation", amountCents: 6000, color: "#d6bca7" },
  ],
  recentTransactions: [
    { id: "coffee", name: "Deet’s Place", category: "Food & coffee", date: "Sep 19", amountCents: -650, icon: "☕" },
    { id: "books", name: "University Bookstore", category: "Shopping", date: "Sep 18", amountCents: -4284, icon: "▤" },
    { id: "transit", name: "Blacksburg Transit", category: "Transportation", date: "Sep 17", amountCents: -1200, icon: "↗" },
  ],
} as const;

// Convert to dollars only at the display boundary.
export function formatMoney(cents: number, decimals = 2) {
  if (!Number.isSafeInteger(cents)) throw new RangeError("Money must be safe integer USD cents");
  return (cents / 100).toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}

// Fixed illustrative results, not a frontend financial engine or API fallback.
// Production totals, affordability, and dated projections belong to the backend.
export const demoSummary = {
  totalSpentCents: 28934,
  budgetRemainingCents: 21066,
  budgetPercent: 57.868,
  savingsRemainingCents: 30000,
  savingsPercent: 70,
  savingsIllustration: "Illustration: 12 weekly contributions of $25 cover the $300 gap. Funding and dates have not been checked.",
} as const;

export const demoChatExamples = [
  {
    label: "Plan my weekend",
    question: "Can I afford to spend $50 this weekend and still save $500 by November?",
    answer: "This scripted demo cannot establish affordability or a November savings date. The sample profile is missing confirmed income, bills, and contribution dates. A live planner would need those details first.",
  },
  {
    label: "Find ways to save",
    question: "How could I save an extra $20 this week?",
    answer: `The sample ${demoData.savingsGoal.name.toLowerCase()} has ${formatMoney(demoData.savingsGoal.savedCents)} allocated within bank cash toward ${formatMoney(demoData.savingsGoal.targetCents)}. Replacing takeout with meals already available is one hypothetical way to save; this demo has not checked whether an extra contribution is affordable.`,
  },
  {
    label: "Budget my dining funds",
    question: "How can I make my Hokie Wallet last longer?",
    answer: `The sample campus balance is ${formatMoney(demoData.walletBalanceCents)}. These restricted funds are separate from bank cash and cannot fund general savings. Any dining plan would need your meal needs and spending schedule; no campus account is connected.`,
  },
] as const;
