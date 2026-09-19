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

export default function Dashboard() {
  return (
    <div className="dashboard">
      <a className="skip-link" href="#main">Skip to dashboard</a>
      <aside className="sidebar">
        <a className="brand" href="#main" aria-label="Hokie Wallet home">
          <span className="brand-icon" aria-hidden="true">hw<span>•</span></span>
          <span>hokie<span className="brand-light">wallet</span></span>
        </a>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          <a className="nav-active" href="#main" aria-current="page"><LayoutDashboard aria-hidden="true" />Overview</a>
          <a href="#activity"><ReceiptText aria-hidden="true" />Recent activity</a>
          <a href="#savings"><Target aria-hidden="true" />Savings goal</a>
          <a href="#finbot"><MessageSquare aria-hidden="true" />Ask FinBot</a>
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
          <span>My workspace <span className="breadcrumb">/ <strong>Overview</strong></span></span>
          <span className="demo-badge"><FlaskConical aria-hidden="true" />Demo workspace</span>
        </header>
        <div className="content">
          <section className="welcome">
            <div>
              <p className="eyebrow">LESS MONEY STRESS. MORE STUDENT LIFE.</p>
              <h1>A little clarity,<br className="mobile-break" /> Hokie.</h1>
              <p>Your everyday money, with the bigger picture in view.</p>
            </div>
            <a className="welcome-action" href="#finbot">Let’s talk money<MessageSquare aria-hidden="true" /></a>
          </section>

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

          <div className="detail-grid">
            <section className="panel spending-panel">
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

            <section className="panel savings-panel" id="savings">
              <div className="section-heading"><div><p className="eyebrow">A LITTLE CLOSER</p><h2>{goal.name}</h2></div><span className="goal-icon"><Target aria-hidden="true" /></span></div>
              <div className="goal-amount"><strong>{money(goal.savedCents, 0)}</strong><span>of {money(goal.targetCents, 0)}</span><b>{demoSummary.savingsPercent}%</b></div>
              <progress value={goal.savedCents} max={goal.targetCents} aria-label={`${goal.name}: ${money(goal.savedCents)} of ${money(goal.targetCents)}`} />
              <p className="goal-caption">{demoSummary.savingsRemainingCents > 0 ? <><strong>{money(demoSummary.savingsRemainingCents, 0)} to go.</strong> Sample allocation, already included in bank cash.</> : "Sample goal reached. Allocation is included in bank cash."}</p>
              <div className="savings-tip"><span aria-hidden="true">↗</span><p>{demoSummary.savingsIllustration}</p></div>
            </section>

            <ChatPanel />

            <section className="panel activity-panel" id="activity">
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
