import {
  demoChatExamples,
  demoData,
  demoSummary,
  formatMoney,
} from "../dashboard/demo-data";

const sampleLabel = `Sample snapshot · ${demoData.month} ${demoData.year}`;

// Display the same fixed values as the dashboard; no financial calculations or API calls.
export const suggestedQuestions = [
  {
    label: "Spending",
    question: "What have I spent this month?",
    answer: `${sampleLabel}\n\nThe sample profile has spent ${formatMoney(demoSummary.totalSpentCents)} of its ${formatMoney(demoData.monthlyBudgetCents)} monthly budget.\n\n${demoData.spending.map((category) => `${category.name}: ${formatMoney(category.amountCents)}`).join("\n")}\n\nThe dashboard shows ${formatMoney(demoSummary.budgetRemainingCents)} remaining in this sample budget. This is not an affordability check; income and upcoming bills have not been confirmed.`,
  },
  {
    label: "Balances",
    question: "What are my balances?",
    answer: `${sampleLabel}\n\nBank cash: ${formatMoney(demoData.bankBalanceCents)}. The ${formatMoney(demoData.savingsGoal.savedCents)} reserved for the ${demoData.savingsGoal.name.toLowerCase()} is already included in this bank balance, not extra cash.\n\nHokie Wallet: ${formatMoney(demoData.walletBalanceCents)} in restricted campus funds, separate from bank cash. These funds cannot fund general savings. No accounts are connected.`,
  },
  {
    label: "Savings",
    question: "How is my savings goal doing?",
    answer: `${sampleLabel}\n\n${demoData.savingsGoal.name}: ${formatMoney(demoData.savingsGoal.savedCents)} allocated toward ${formatMoney(demoData.savingsGoal.targetCents)}, with ${formatMoney(demoSummary.savingsRemainingCents)} remaining. The allocation is already included in bank cash.\n\n${demoSummary.savingsIllustration}`,
  },
] as const;

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?!.]+$/, "").trim();
}

export function getDemoReply(question: string) {
  // Match whole supported questions, never keywords that could imply affordability.
  const normalized = normalizeQuestion(question);
  const example = [...suggestedQuestions, ...demoChatExamples].find(
    (item) => normalizeQuestion(item.question) === normalized,
  );
  return example?.answer ??
    "This is a scripted demo, so I can’t answer custom questions yet. For a sample balance summary, ask “What are my balances?” No accounts are connected.";
}
