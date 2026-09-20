import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

const lato = localFont({
  src: [
    { path: "./fonts/Lato-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Lato-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Lato-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-lato",
  display: "swap",
});
const comic = localFont({ src: "./fonts/ComicRelief-Bold.woff2", weight: "700", variable: "--font-comic", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Hokie Wallet · Student budgeting", template: "%s · Hokie Wallet" },
  description: "Your money, meals, and savings in one place. Built by Hokies for Virginia Tech students.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${lato.variable} ${comic.variable}`}><body>{children}</body></html>;
}
