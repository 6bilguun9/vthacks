"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import CampusSidebar from "@/features/dashboard/CampusSidebar";
import NotificationBell from "@/features/notifications/NotificationBell";
import { AccessibilityControls, useAccessibilityPreferences } from "@/features/dashboard/accessibility-controls";
import { getInterfaceCopy, isRtlLanguage } from "@/features/dashboard/interface-language";
import { useDashboardTheme } from "@/features/dashboard/theme-preference";
import { ConnectionControl } from "@/features/session/connection-control";
import { useFinancialSession } from "@/features/session/financial-session";

const diningSummary = "Dining planner. Build a weekly meal rhythm around your Virginia Tech dining plan, schedule, preferences, and campus balances. The form includes dining plan, student status, balances, weeks remaining, dietary needs, and an option to use Hokie Passport funds as a fallback.";

export function DiningShell({ children, showIntro = false }: { children: ReactNode; showIntro?: boolean }) {
  const session = useFinancialSession();
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const { theme, toggleTheme } = useDashboardTheme();
  const copy = getInterfaceCopy(preferences.language);
  const readText = preferences.language === "en" ? diningSummary : `${copy.diningTitle} ${copy.diningDescription}`;

  return (
    <div className="dashboard dining-dashboard" dir={isRtlLanguage(preferences.language) ? "rtl" : "ltr"} lang={preferences.language}
      data-theme={theme} data-view="dining" data-color-palette={preferences.colorPalette}
      data-contrast={preferences.contrast} data-motion={preferences.motion}
      style={{ "--text-scale": preferences.textScale / 100 } as CSSProperties}>
      <a className="skip-link" href="#main">{copy.overview.skipDining}</a>
      <CampusSidebar activeView="dining" labels={copy.nav} copy={copy.overview} />
      <main id="main">
        <header className="topbar">
          <span className="page-location">{copy.nav.dining}</span>
          <div className="topbar-actions">
            <ConnectionControl />
            {session.mode === "demo" && <NotificationBell />}
            <AccessibilityControls preferences={preferences} readText={readText} updatePreference={updatePreference} />
            <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "light" ? copy.darkMode : copy.lightMode}>
              <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span> {theme === "light" ? copy.darkMode : copy.lightMode}
            </button>
            <span className="demo-badge"><span /> {!showIntro ? "Sample calendar" : session.mode === "live" ? "Guest dining planner" : "Demo mode"}</span>
          </div>
        </header>
        <div className="content dining-content">
          <div className="dining-view view-panel">
            {showIntro && <section className="dining-hero">
              <div className="dining-hero-copy"><p className="eyebrow">{copy.diningKicker}</p><h1>{copy.diningTitle}</h1><p>{copy.diningDescription}</p></div>
              <figure className="dining-photo">
                <Image src="/campus/origami.png" alt={copy.overview.diningPhotoAlt} width={600} height={400} sizes="(max-width: 800px) 100vw, 460px" preload />
                <figcaption>Origami · Turner Place</figcaption>
              </figure>
            </section>}
            {children}
          </div>
          <footer><span>{copy.overview.footer}</span></footer>
        </div>
      </main>
    </div>
  );
}
