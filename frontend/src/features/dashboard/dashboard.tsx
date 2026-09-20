"use client";

import { useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import ChatPanel from "@/features/chat/ChatPanel";
import Link from "next/link";
import Image from "next/image";
import CampusSidebar from "./CampusSidebar";
import NotificationBell from "@/features/notifications/NotificationBell";
import { AccessibilityControls, useAccessibilityPreferences } from "./accessibility-controls";
import { getInterfaceCopy, isRtlLanguage } from "./interface-language";
import { useDashboardTheme } from "./theme-preference";

import { demoData, demoSummary, formatMoney as money } from "./demo-data";

const { spending, recentTransactions: transactions, savingsGoal: goal } = demoData;

function Balance({ amount }: { amount: number }) {
  const [whole, cents] = money(amount).split(".");
  return <h2>{whole}<span>.{cents}</span></h2>;
}

// Each chart segment follows its category's share of the sample spending.
let chartPosition = 0;
const chartSegments = spending.map((item) => {
  const start = chartPosition;
  chartPosition += demoSummary.totalSpentCents > 0 ? item.amountCents / demoSummary.totalSpentCents * 100 : 0;
  const end = Math.max(start, chartPosition - 0.75);
  return `var(--chart-${spending.indexOf(item) + 1}, ${item.color}) ${start}% ${end}%, var(--chart-gap, #fff) ${end}% ${chartPosition}%`;
});
const chartBackground = demoSummary.totalSpentCents > 0
  ? `conic-gradient(${chartSegments.join(", ")})`
  : "#efeff2";

const views = {
  main: { label: "Overview", title: "Your budget" },
  activity: { label: "Activity", title: "Transactions" },
  savings: { label: "Savings", title: "Your savings" },
  finbot: { label: "FinBot", title: "FinBot" },
};
type View = keyof typeof views;
function subscribeView(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}
function currentView(): View {
  const hash = window.location.hash.slice(1);
  return Object.hasOwn(views, hash) ? hash as View : "main";
}
function navigate(event: MouseEvent<HTMLAnchorElement>, view: View) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (currentView() !== view) {
    window.history.pushState(null, "", `#${view}`);
    window.dispatchEvent(new Event("hashchange"));
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

export default function Dashboard() {
  const view = useSyncExternalStore(subscribeView, currentView, () => "main" as View);
  const { theme, toggleTheme } = useDashboardTheme();
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const copy = getInterfaceCopy(preferences.language);
  const viewCopy = copy.views[view];
  const readText = preferences.language === "en" ? getViewSummary(view) : `${viewCopy.title} ${viewCopy.description}`;
  return (
    <div
      className="dashboard"
      dir={isRtlLanguage(preferences.language) ? "rtl" : "ltr"}
      lang={preferences.language}
      data-theme={theme}
      data-view={view}
      data-color-palette={preferences.colorPalette}
      data-contrast={preferences.contrast}
      data-motion={preferences.motion}
      style={{ "--text-scale": preferences.textScale / 100 } as CSSProperties}
    >
      <a className="skip-link" href="#main">Skip to dashboard</a>
      <CampusSidebar activeView={view} labels={copy.nav} onNavigate={navigate} />
      <main id="main">
        <header className="topbar"><span className="page-location">{copy.nav[view]}</span><div className="topbar-actions"><NotificationBell onViewGoal={(event) => navigate(event, "savings")} /><AccessibilityControls preferences={preferences} readText={readText} updatePreference={updatePreference} /><button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "light" ? copy.darkMode : copy.lightMode}><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span> {theme === "light" ? copy.darkMode : copy.lightMode}</button><span className="demo-badge"><span /> {copy.demoSample}</span></div></header>
        <div className="content">
          {view !== "finbot" && <div className="view-heading" key={view}>
            <section className="welcome"><h1>{viewCopy.title}</h1><span className="date-label">{demoData.month} {demoData.year}</span></section>
          </div>}
          <div hidden={view !== "main"} className="view-panel overview-view">
          <section className="balance-grid" aria-label={copy.balances.accountOverview}>
            <article className="balance-card"><div className="card-label">{copy.balances.bankBalance} <span className="card-icon" aria-hidden="true">▥</span></div><Balance amount={demoData.bankBalanceCents} /><p><span className="status-dot" /> {copy.balances.checkingDescription}</p></article>
            <article className="balance-card wallet-card"><div className="card-label">Hokie Wallet <span className="card-icon" aria-hidden="true">▱</span></div><Balance amount={demoData.walletBalanceCents} /><p>{copy.balances.walletDescription} <span aria-hidden="true">↗</span></p></article>
            <article className="balance-card"><div className="card-label">{copy.balances.monthlySpending} <span className="card-icon" aria-hidden="true">↗</span></div><Balance amount={demoSummary.totalSpentCents} /><p>{copy.balances.monthlyBudget(money(demoData.monthlyBudgetCents, 0))}</p><div className="budget-track" role="progressbar" aria-label={copy.balances.budgetSpent} aria-valuenow={demoSummary.budgetPercent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={copy.balances.spentOfBudget(money(demoSummary.totalSpentCents), money(demoData.monthlyBudgetCents))}><span style={{ width: `${demoSummary.budgetPercent}%` }} /></div></article>
          </section>
          <p className="sample-notice">{copy.balances.sampleNotice}</p>
          <section className="milestone-strip" aria-label="Sample savings milestone">
            <span className="milestone-mark" aria-hidden="true">◎</span>
            <div><p><strong>{money(goal.savedCents, 0)} saved</strong> toward your {goal.name.toLowerCase()}.</p></div>
            <a href="#savings" onClick={(event) => navigate(event, "savings")}>See your progress <span aria-hidden="true">↗</span></a>
          </section>
          </div>
          <div className={`detail-grid view-${view}`}>
            <section hidden={view !== "main"} className="panel spending-panel view-panel"><div className="section-heading"><div><p className="eyebrow">THE BIG PICTURE</p><h2>A month in spending</h2></div><span className="subtle-pill">{demoData.month}</span></div><div className="spending-content"><div className="donut" role="img" style={{ background: chartBackground }} aria-label={`Total spending: ${money(demoSummary.totalSpentCents)}. ${spending.map((item) => `${item.name}: ${money(item.amountCents)}`).join(", ")}`}><div><span>Total spent</span><strong>{money(demoSummary.totalSpentCents)}</strong><small>this month</small></div></div><div className="legend">{spending.map((item, index) => <div className="legend-row" key={item.name}><span className={`legend-dot legend-dot-${index + 1}`} aria-hidden="true" /><span className="legend-symbol" aria-hidden="true">{["●", "◆", "■"][index]}</span><span>{item.name}</span><strong>{money(item.amountCents)}</strong></div>)}<p className="budget-note">{demoSummary.budgetRemainingCents >= 0 ? <>You have <strong>{money(demoSummary.budgetRemainingCents)}</strong> left in your budget.</> : <>You are <strong>{money(Math.abs(demoSummary.budgetRemainingCents))}</strong> over your budget.</>}</p></div></div></section>
            <section hidden={view !== "savings"} className="panel savings-panel view-panel"><div className="section-heading"><div><p className="eyebrow">LOOKING AHEAD</p><h2>A little closer every day</h2></div><span className="goal-icon" aria-hidden="true">◎</span></div><p className="goal-name">{goal.name} <span>Savings goal</span></p><div className="goal-amount"><strong>{money(goal.savedCents, 0)}</strong><span>of {money(goal.targetCents, 0)}</span><b>{demoSummary.savingsPercent}%</b></div><progress value={goal.savedCents} max={goal.targetCents} aria-label={`${goal.name}: ${money(goal.savedCents)} of ${money(goal.targetCents)}`} /><p className="goal-caption">{demoSummary.savingsRemainingCents > 0 ? <>Just <strong>{money(demoSummary.savingsRemainingCents, 0)} to go.</strong> Future you says thanks.</> : "Goal reached. Future you says thanks!"}</p><div className="savings-tip"><span aria-hidden="true">✧</span><p>Little by little adds up.<br /><strong>{demoSummary.savingsIllustration}</strong></p></div></section>
            <section hidden={view !== "activity"} className="panel activity-panel view-panel"><div className="section-heading"><div><p className="eyebrow">THE EVERYDAY DETAILS</p><h2>Recent activity</h2></div><span className="subtle-pill">Sample transactions</span></div><ul className="transactions">{transactions.map((item) => <li key={item.id}><span className="transaction-icon" aria-hidden="true">{item.icon}</span><div className="transaction-name"><strong>{item.name}</strong><span>{item.category} · {item.date}</span></div><strong>{money(item.amountCents)}</strong></li>)}</ul><p className="activity-note">A snapshot of your latest sample purchases.</p></section>
            <div hidden={view !== "finbot"} className="chat-view view-panel"><ChatPanel isVisible={view === "finbot"} /></div>
            <section hidden={view !== "main"} className="panel campus-dining-card view-panel" aria-labelledby="campus-dining-title">
              <Image src="/campus/origami.png" alt="Origami dining venue inside Turner Place at Virginia Tech" width={600} height={400} sizes="(max-width: 800px) 100vw, 450px" />
              <div><span className="campus-caption">Origami · Turner Place</span><h2 id="campus-dining-title">Plan your campus meals</h2><Link href="/dining">Open dining planner <span aria-hidden="true">↗</span></Link></div>
            </section>
          </div>

          <footer><span>Built by Hokies · VTHacks 14</span></footer>
        </div>
      </main>
    </div>
  );
}

function getViewSummary(view: View) {
  if (view === "activity") {
    return `Recent activity. ${transactions.map((item) => `${item.name}, ${item.category}, ${money(item.amountCents)}, on ${item.date}.`).join(" ")}`;
  }
  if (view === "savings") {
    return `Savings goal. ${goal.name}. ${money(goal.savedCents)} saved of ${money(goal.targetCents)}, or ${demoSummary.savingsPercent} percent. ${money(demoSummary.savingsRemainingCents)} remains.`;
  }
  if (view === "finbot") {
    return "FinBot. This is a scripted demonstration using sample data. Type a question about spending, balances, or savings. Saved chats appear in the history sidebar.";
  }
  return `Overview. Sample bank balance ${money(demoData.bankBalanceCents)}. Restricted Hokie Wallet balance ${money(demoData.walletBalanceCents)}. Spending this month ${money(demoSummary.totalSpentCents)} of a ${money(demoData.monthlyBudgetCents)} budget. Emergency fund progress is ${demoSummary.savingsPercent} percent.`;
}
