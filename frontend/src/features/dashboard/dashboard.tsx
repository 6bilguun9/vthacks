"use client";

import { useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import ChatPanel from "@/features/chat/ChatPanel";
import Link from "next/link";
import { AccessibilityControls, useAccessibilityPreferences } from "./accessibility-controls";
import { useDashboardTheme } from "./theme-preference";
import "./dashboard.css";

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
  main: { label: "Overview", title: "Make room for what matters.", description: "A clearer view of today. A little more confidence for tomorrow.", icon: "◫" },
  activity: { label: "Recent activity", title: "The little things add up.", description: "A closer look at your latest sample purchases.", icon: "⇄" },
  savings: { label: "Savings goal", title: "A little closer every day.", description: "Make space for your next chapter, one contribution at a time.", icon: "◎" },
  finbot: { label: "Ask FinBot", title: "Let’s talk money.", description: "Explore your questions with a sample conversation.", icon: "✧" },
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
  const readText = getViewSummary(view);
  return (
    <div
      className="dashboard"
      data-theme={theme}
      data-view={view}
      data-color-palette={preferences.colorPalette}
      data-contrast={preferences.contrast}
      data-motion={preferences.motion}
      style={{ "--text-scale": preferences.textScale / 100 } as CSSProperties}
    >
      <a className="skip-link" href="#main">Skip to dashboard</a>
      <aside className="sidebar">
        <a className="brand" href="#main" onClick={(event) => navigate(event, "main")}><span className="brand-icon">hw<span>•</span></span><span>hokie<span className="brand-light">wallet</span></span></a>
        <p className="nav-label">YOUR MONEY, SIMPLIFIED</p>
        <nav aria-label="Main navigation">
          {(Object.keys(views) as View[]).map((key) => (
            <a key={key} className={view === key ? "nav-active" : undefined} href={`#${key}`} onClick={(event) => navigate(event, key)} aria-current={view === key ? "page" : undefined}>
              <span aria-hidden="true">{views[key].icon}</span> {views[key].label}
            </a>
          ))}
          <Link href="/dining"><span aria-hidden="true">♨</span> Dining planner</Link>
        </nav>
        <div className="sidebar-note"><span className="little-star" aria-hidden="true">✳</span><h3>Small steps.<br />Big possibilities.</h3><p>A little clarity goes a long way. Make room for what matters.</p><span className="hokie-tag">MADE FOR HOKIES</span></div>
        <div className="profile"><span className="avatar">H</span><div><strong>Hokie student</strong><small>Personal dashboard</small></div></div>
      </aside>
      <main id="main">
        <header className="topbar"><span>My workspace <span className="breadcrumb">/ {views[view].label}</span></span><div className="topbar-actions"><AccessibilityControls preferences={preferences} readText={readText} updatePreference={updatePreference} /><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span> {theme === "light" ? "Dark mode" : "Light mode"}</button><span className="demo-badge"><span /> Demo · Sample data</span></div></header>
        <div className="content">
          <div className="view-heading" key={view}>
          <section className="welcome"><div><p className="eyebrow">YOUR CAMPUS. YOUR PLANS. YOUR MONEY.</p><h1>{views[view].title}</h1><p>{views[view].description}</p></div><div className="welcome-actions"><span className="date-label">{demoData.month} {demoData.year} · Sample profile</span><a className="coach-link" href="#finbot" onClick={(event) => navigate(event, "finbot")}>Talk it through with FinBot <span aria-hidden="true">↗</span></a></div></section>
          </div>
          <div hidden={view !== "main"} className="view-panel overview-view">
          <section className="balance-grid" aria-label="Account overview">
            <article className="balance-card"><div className="card-label">Bank balance <span className="card-icon" aria-hidden="true">▥</span></div><Balance amount={demoData.bankBalanceCents} /><p><span className="status-dot" /> Sample checking cash · includes goal allocation</p></article>
            <article className="balance-card wallet-card"><div className="card-label">Hokie Wallet <span className="card-icon" aria-hidden="true">▱</span></div><Balance amount={demoData.walletBalanceCents} /><p>Restricted campus funds · not bank cash <span aria-hidden="true">↗</span></p></article>
            <article className="balance-card"><div className="card-label">Spent this month <span className="card-icon" aria-hidden="true">↗</span></div><Balance amount={demoSummary.totalSpentCents} /><p>Of your {money(demoData.monthlyBudgetCents, 0)} monthly budget</p><div className="budget-track" role="progressbar" aria-label="Monthly budget spent" aria-valuenow={demoSummary.budgetPercent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${money(demoSummary.totalSpentCents)} spent of ${money(demoData.monthlyBudgetCents)}`}><span style={{ width: `${demoSummary.budgetPercent}%` }} /></div></article>
          </section>
          <p className="sample-notice">Sample data only · Fixed September 2026 snapshot. Goal allocations are reserved within bank cash. Campus funds are restricted. Illustrations do not establish affordability.</p>
          <section className="milestone-strip" aria-label="Sample savings milestone">
            <span className="milestone-mark" aria-hidden="true">◎</span>
            <div><p className="eyebrow">ONE GOAL. STEADY PROGRESS.</p><p><strong>{money(goal.savedCents, 0)} set aside</strong> for your {goal.name.toLowerCase()}.</p></div>
            <a href="#savings" onClick={(event) => navigate(event, "savings")}>See your progress <span aria-hidden="true">↗</span></a>
          </section>
          </div>
          <div className={`detail-grid view-${view}`}>
            <section hidden={view !== "main"} className="panel spending-panel view-panel"><div className="section-heading"><div><p className="eyebrow">THE BIG PICTURE</p><h2>A month in spending</h2></div><span className="subtle-pill">{demoData.month}</span></div><div className="spending-content"><div className="donut" role="img" style={{ background: chartBackground }} aria-label={`Total spending: ${money(demoSummary.totalSpentCents)}. ${spending.map((item) => `${item.name}: ${money(item.amountCents)}`).join(", ")}`}><div><span>Total spent</span><strong>{money(demoSummary.totalSpentCents)}</strong><small>this month</small></div></div><div className="legend">{spending.map((item, index) => <div className="legend-row" key={item.name}><span className={`legend-dot legend-dot-${index + 1}`} aria-hidden="true" /><span className="legend-symbol" aria-hidden="true">{["●", "◆", "■"][index]}</span><span>{item.name}</span><strong>{money(item.amountCents)}</strong></div>)}<p className="budget-note">{demoSummary.budgetRemainingCents >= 0 ? <>You have <strong>{money(demoSummary.budgetRemainingCents)}</strong> left in your budget.</> : <>You are <strong>{money(Math.abs(demoSummary.budgetRemainingCents))}</strong> over your budget.</>}</p></div></div></section>
            <section hidden={view !== "savings"} className="panel savings-panel view-panel"><div className="section-heading"><div><p className="eyebrow">LOOKING AHEAD</p><h2>A little closer every day</h2></div><span className="goal-icon" aria-hidden="true">◎</span></div><p className="goal-name">{goal.name} <span>Savings goal</span></p><div className="goal-amount"><strong>{money(goal.savedCents, 0)}</strong><span>of {money(goal.targetCents, 0)}</span><b>{demoSummary.savingsPercent}%</b></div><progress value={goal.savedCents} max={goal.targetCents} aria-label={`${goal.name}: ${money(goal.savedCents)} of ${money(goal.targetCents)}`} /><p className="goal-caption">{demoSummary.savingsRemainingCents > 0 ? <>Just <strong>{money(demoSummary.savingsRemainingCents, 0)} to go.</strong> Future you says thanks.</> : "Goal reached. Future you says thanks!"}</p><div className="savings-tip"><span aria-hidden="true">✧</span><p>Little by little adds up.<br /><strong>{demoSummary.savingsIllustration}</strong></p></div></section>
            <section hidden={view !== "activity"} className="panel activity-panel view-panel"><div className="section-heading"><div><p className="eyebrow">THE EVERYDAY DETAILS</p><h2>Recent activity</h2></div><span className="subtle-pill">Sample transactions</span></div><ul className="transactions">{transactions.map((item) => <li key={item.id}><span className="transaction-icon" aria-hidden="true">{item.icon}</span><div className="transaction-name"><strong>{item.name}</strong><span>{item.category} · {item.date}</span></div><strong>{money(item.amountCents)}</strong></li>)}</ul><p className="activity-note">A snapshot of your latest sample purchases.</p></section>
            <div hidden={view !== "finbot"} className="chat-view view-panel"><ChatPanel isVisible={view === "finbot"} /></div>
            <section hidden={view !== "main"} className="panel next-step view-panel">
              <p className="eyebrow">YOUR NEXT SMALL STEP</p>
              <h2>A plan starts with a little clarity.</h2>
              <p>Explore your savings goal or take a closer look at where your sample spending goes.</p>
              <a href="#savings" onClick={(event) => navigate(event, "savings")}>Explore your savings goal <span aria-hidden="true">↗</span></a>
              <a href="#activity" onClick={(event) => navigate(event, "activity")}>Review recent activity <span aria-hidden="true">↗</span></a>
            </section>
          </div>

          <footer><span><strong>hokiewallet</strong> · More clarity. Less money stress.</span><span>Built for student life <span aria-hidden="true">↗</span></span></footer>
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
    return "Ask FinBot. This is a scripted demonstration using sample data. You can choose an example prompt or type a question about spending and saving.";
  }
  return `Overview. Sample bank balance ${money(demoData.bankBalanceCents)}. Restricted Hokie Wallet balance ${money(demoData.walletBalanceCents)}. Spending this month ${money(demoSummary.totalSpentCents)} of a ${money(demoData.monthlyBudgetCents)} budget. Emergency fund progress is ${demoSummary.savingsPercent} percent.`;
}
