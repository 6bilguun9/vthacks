"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftRight, LayoutDashboard, Sparkles, Target, Utensils } from "lucide-react";
import {
  AccessibilityControls,
  useAccessibilityPreferences,
} from "@/features/dashboard/accessibility-controls";
import { getInterfaceCopy, isRtlLanguage } from "@/features/dashboard/interface-language";
import { useDashboardTheme } from "@/features/dashboard/theme-preference";
import "@/features/dashboard/dashboard.css";

const navigation = [
  { href: "/#main", icon: LayoutDashboard, key: "main" },
  { href: "/#activity", icon: ArrowLeftRight, key: "activity" },
  { href: "/#savings", icon: Target, key: "savings" },
  { href: "/#finbot", icon: Sparkles, key: "finbot" },
] as const;

const diningSummary = "Dining planner. Build a sample weekly meal rhythm around your Virginia Tech dining plan, schedule, preferences, and campus balances. The form includes dining plan, student status, balances, weeks remaining, dietary needs, and an option to use Hokie Passport funds as a fallback.";

export function DiningShell({ children }: { children: ReactNode }) {
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const { theme, toggleTheme } = useDashboardTheme();
  const copy = getInterfaceCopy(preferences.language);
  const readText = preferences.language === "en" ? diningSummary : `${copy.diningTitle} ${copy.diningDescription}`;

  return (
    <div
      className="dashboard dining-dashboard"
      dir={isRtlLanguage(preferences.language) ? "rtl" : "ltr"}
      lang={preferences.language}
      data-theme={theme}
      data-view="dining"
      data-color-palette={preferences.colorPalette}
      data-contrast={preferences.contrast}
      data-motion={preferences.motion}
      style={{ "--text-scale": preferences.textScale / 100 } as CSSProperties}
    >
      <a className="skip-link" href="#main">Skip to dining planner</a>
      <aside className="sidebar">
        <Link className="brand" href="/#main">
          <span className="brand-icon">hw<span>•</span></span>
          <span>hokie<span className="brand-light">wallet</span></span>
        </Link>
        <p className="nav-label">YOUR MONEY, SIMPLIFIED</p>
        <nav aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <span className="nav-icon" aria-hidden="true"><Icon /></span>
                <span className="nav-text">{copy.nav[item.key]}</span>
              </Link>
            );
          })}
          <Link className="nav-active" href="/dining" aria-current="page">
            <span className="nav-icon" aria-hidden="true"><Utensils /></span>
            <span className="nav-text">{copy.nav.dining}</span>
          </Link>
        </nav>
        <div className="sidebar-note">
          <span className="little-star" aria-hidden="true">✳</span>
          <h3>Fuel your week.<br />Protect your budget.</h3>
          <p>Turn campus balances and a busy schedule into a meal rhythm that works.</p>
          <span className="hokie-tag">MADE FOR HOKIES</span>
        </div>
        <div className="profile"><span className="avatar">H</span><div><strong>Hokie student</strong><small>Personal dashboard</small></div></div>
      </aside>
      <main id="main">
        <header className="topbar">
          <span>{copy.workspace} <span className="breadcrumb">/ {copy.nav.dining}</span></span>
          <div className="topbar-actions">
            <AccessibilityControls preferences={preferences} readText={readText} updatePreference={updatePreference} />
            <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "light" ? copy.darkMode : copy.lightMode}>
              <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span> {theme === "light" ? copy.darkMode : copy.lightMode}
            </button>
            <span className="demo-badge"><span /> {copy.plannerSample}</span>
          </div>
        </header>
        <div className="content dining-content">
          <div className="dining-view view-panel">
            <section className="dining-hero">
              <p className="eyebrow">{copy.diningKicker}</p>
              <h1>{copy.diningTitle}</h1>
              <p>{copy.diningDescription}</p>
            </section>
            {children}
          </div>
          <footer><span><strong>hokiewallet</strong> · More clarity. Less money stress.</span><span>Built for student life <span aria-hidden="true">↗</span></span></footer>
        </div>
      </main>
    </div>
  );
}
