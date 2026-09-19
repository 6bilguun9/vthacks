import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dining Planner · VT Student Savings Planner",
  description: "Plan a Virginia Tech dining week around your schedule, preferences, and campus balances.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
