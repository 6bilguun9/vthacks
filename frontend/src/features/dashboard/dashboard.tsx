"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import {
  ArrowRight, ArrowUpRight, BookOpen, Bus, CalendarDays, ChartPie,
  Coffee, FlaskConical, Landmark, LayoutDashboard, MessageSquare,
  ReceiptText, Target, Utensils, Wallet,
} from "lucide-react";
import Link from "next/link";
import ChatPanel from "@/features/chat/ChatPanel";
import { ApiStatus } from "@/features/system/api-status";
import { demoData, demoSummary, formatMoney as money } from "./demo-data";
import "./dashboard.css";

const { spending, recentTransactions: transactions, savingsGoal: goal } = demoData;
const transactionIcons = { coffee: Coffee, books: BookOpen, transit: Bus };

function Balance({ amount }: { amount: number }) {
  const [whole, cents] = money(amount).split(".");
  return <h2>{whole}<span>.{cents}</span></h2>;
}

// Chart proportions visualize the fixed sample totals, without projecting finances.
let chartPosition = 0;
const chartSegments = spending.map((item) => {
  const start = chartPosition;
  chartPosition += demoSummary.totalSpentCents > 0 ? item.amountCents / demoSummary.totalSpentCents * 100 : 0;
  const end = Math.max(start, chartPosition - 0.75);
  return `${item.color} ${start}% ${end}%, #fff ${end}% ${chartPosition}%`;
});
const chartBackground = demoSummary.totalSpentCents > 0
  ? `conic-gradient(${chartSegments.join(", ")})`
  : "#efeff2";

const views = {
  main: { label: "Overview", title: "A little clarity, Hokie.", description: "Your everyday money, with the bigger picture in view.", icon: "◫" },
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
function subscribeTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  window.addEventListener("storage", callback);
  window.addEventListener("wallet-theme", callback);
  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("wallet-theme", callback);
  };
}
let temporaryTheme: string | null = null;
function currentTheme() {
  let saved = temporaryTheme;
  try { saved = localStorage.getItem("hokie-wallet-theme") ?? saved; } catch { /* Storage may be disabled. */ }
  return saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "light");
  function toggleTheme() {
    temporaryTheme = theme === "light" ? "dark" : "light";
    try { localStorage.setItem("hokie-wallet-theme", temporaryTheme); } catch { /* Use an in-memory preference. */ }
    window.dispatchEvent(new Event("wallet-theme"));
  }
  return (
    <div className="dashboard" data-theme={theme} data-view={view}>
      <a className="skip-link" href="#main">Skip to dashboard</a>
      <aside className="sidebar">
        <a className="brand" href="#main" onClick={(event) => navigate(event, "main")} aria-label="Hokie Wallet home">
          <span className="brand-icon" aria-hidden="true">hw<span>•</span></span>
          <span>hokie<span className="brand-light">wallet</span></span>
        </a>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {(Object.keys(views) as View[]).map((key) => {
            const Icon = { main: LayoutDashboard, activity: ReceiptText, savings: Target, finbot: MessageSquare }[key];
            return <a key={key} className={view === key ? "nav-active" : undefined} href={`#${key}`} onClick={(event) => navigate(event, key)} aria-current={view === key ? "page" : undefined}><Icon aria-hidden="true" />{views[key].label}</a>;
          })}
          <Link href="/dining"><Utensils aria-hidden="true" />Dining planner<ArrowUpRight className="nav-arrow" aria-hidden="true" /></Link>
        </nav>
        <div className="sidebar-note">
          <span className="note-mark" aria-hidden="true">✳</span>
          <h3>Small steps.<br />More possibilities.</h3>
          <p>A little clarity for everything college brings.</p>
          <span className="hokie-tag">MADE FOR HOKIES</span>
        </div>
        <div className="profile"><span className="avatar" aria-hidden="true">H</span><div><strong>Hokie student</strong><small>Sample profile</small></div></div>
      </aside>

      <main id="main">
        <header className="topbar">
          <span>My workspace <span className="breadcrumb">/ <strong>{views[view].label}</strong></span></span>
          <div className="topbar-actions">
            <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>{theme === "light" ? "Dark mode" : "Light mode"}</button>
            <span className="demo-badge"><FlaskConical aria-hidden="true" />Demo workspace</span>
          </div>
        </header>
        <div className="content">
          <section className="welcome view-heading" key={view}>
            <div>
              <p className="eyebrow">LESS MONEY STRESS. MORE STUDENT LIFE.</p>
              <h1>{views[view].title}</h1>
              <p>{views[view].description}</p>
            </div>
            <a hidden={view === "finbot"} className="welcome-action" href="#finbot" onClick={(event) => navigate(event, "finbot")}>Let’s talk money<MessageSquare aria-hidden="true" /></a>
          </section>

          <div hidden={view !== "main"} className="overview-view view-panel">
          <div className="snapshot-heading">
            <h2>Your money at a glance</h2>
            <span><CalendarDays aria-hidden="true" />{demoData.month} {demoData.year} · sample</span>
          </div>
          <section className="balance-grid" aria-label="Account overview">
            <article className="balance-card bank-card">
              <div className="card-label">Bank balance<Landmark aria-hidden="true" /></div>
              <Balance amount={demoData.bankBalanceCents} />
              <p>Checking cash · includes savings allocation</p>
              <span className="balance-footnote">SAMPLE BANK ACCOUNT</span>
            </article>
            <article className="balance-card wallet-card">
              <div className="card-label">Hokie Wallet<Wallet aria-hidden="true" /></div>
              <Balance amount={demoData.walletBalanceCents} />
              <p>Restricted campus funds · separate from bank cash</p>
              <Link className="balance-link" href="/dining">Explore dining planner<ArrowRight aria-hidden="true" /></Link>
            </article>
            <article className="balance-card spending-card">
              <div className="card-label">Spent this month<ChartPie aria-hidden="true" /></div>
              <Balance amount={demoSummary.totalSpentCents} />
              <p>Of a {money(demoData.monthlyBudgetCents, 0)} sample monthly budget</p>
              <div className="budget-track" role="progressbar" aria-label="Monthly budget spent" aria-valuenow={demoSummary.budgetPercent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${money(demoSummary.totalSpentCents)} spent of ${money(demoData.monthlyBudgetCents)}`}>
                <span style={{ width: `${demoSummary.budgetPercent}%` }} />
              </div>
            </article>
          </section>
          <p className="sample-notice"><FlaskConical aria-hidden="true" /><span><strong>A sample, not your account.</strong> Fixed September 2026 data. No accounts are connected; illustrations do not establish affordability.</span></p>

          </div>
          <div className={`detail-grid view-${view}`}>
            <section hidden={view !== "main"} className="panel spending-panel view-panel">
              <div className="section-heading"><div><p className="eyebrow">THE EVERYDAY PICTURE</p><h2>Where it’s going</h2></div><span className="subtle-pill">{demoData.month}</span></div>
              <div className="spending-content">
                <div className="donut" role="img" style={{ background: chartBackground }} aria-label={`Total spending: ${money(demoSummary.totalSpentCents)}. ${spending.map((item) => `${item.name}: ${money(item.amountCents)}`).join(", ")}`}>
                  <div><span>Total spent</span><strong>{money(demoSummary.totalSpentCents)}</strong><small>sample spending</small></div>
                </div>
                <div className="legend">
                  {spending.map((item) => <div className="legend-row" key={item.name}><span className="legend-dot" style={{ background: item.color }} aria-hidden="true" /><span>{item.name}</span><strong>{money(item.amountCents)}</strong></div>)}
                </div>
              </div>
              <p className="budget-note">{demoSummary.budgetRemainingCents >= 0 ? <><strong>{money(demoSummary.budgetRemainingCents)}</strong> remaining in the sample monthly budget.</> : <><strong>{money(Math.abs(demoSummary.budgetRemainingCents))}</strong> over the sample monthly budget.</>}</p>
            </section>

            <section hidden={view !== "main" && view !== "savings"} className="panel savings-panel view-panel" id="savings">
              <div className="section-heading"><div><p className="eyebrow">A LITTLE CLOSER</p><h2>{goal.name}</h2></div><span className="goal-icon"><Target aria-hidden="true" /></span></div>
              <div className="goal-amount"><strong>{money(goal.savedCents, 0)}</strong><span>of {money(goal.targetCents, 0)}</span><b>{demoSummary.savingsPercent}%</b></div>
              <progress value={goal.savedCents} max={goal.targetCents} aria-label={`${goal.name}: ${money(goal.savedCents)} of ${money(goal.targetCents)}`} />
              <p className="goal-caption">{demoSummary.savingsRemainingCents > 0 ? <><strong>{money(demoSummary.savingsRemainingCents, 0)} to go.</strong> Sample allocation, already included in bank cash.</> : "Sample goal reached. Allocation is included in bank cash."}</p>
              <div className="savings-tip"><span aria-hidden="true">↗</span><p>{demoSummary.savingsIllustration}</p></div>
            </section>

            <div hidden={view !== "main" && view !== "finbot"} className="chat-view view-panel"><ChatPanel isVisible={view === "main" || view === "finbot"} /></div>

            <section hidden={view !== "main" && view !== "activity"} className="panel activity-panel view-panel" id="activity">
              <div className="section-heading"><div><p className="eyebrow">THE SMALL THINGS ADD UP</p><h2>Recent activity</h2></div><span className="subtle-pill">Sample transactions</span></div>
              <ul className="transactions">
                {transactions.map((item) => {
                  const Icon = transactionIcons[item.id];
                  return <li key={item.id}><span className="transaction-icon"><Icon aria-hidden="true" /></span><div className="transaction-name"><strong>{item.name}</strong><span>{item.category}</span></div><time className="transaction-date" dateTime={`${demoData.year}-09-${item.date.split(" ")[1]}`}>{item.date}</time><strong className="transaction-amount">{money(item.amountCents)}</strong></li>;
                })}
              </ul>
              <p className="activity-note">A few sample purchases. Monthly totals include the full sample spending breakdown above.</p>
            </section>
          </div>

          <details className="api-connection">
            <summary><span>Workspace connection</span><span className="connection-hint">View live API health</span></summary>
            <ApiStatus />
          </details>
          <footer><span><strong>hokiewallet</strong> · Made for your next chapter.</span><span>Built for student life at Virginia Tech<ArrowUpRight aria-hidden="true" /></span></footer>
        </div>
      </main>
    </div>
  );
}
