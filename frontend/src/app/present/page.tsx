import type { Metadata } from "next";
import { Presentation } from "@/features/presentation/presentation";

export const metadata: Metadata = {
  title: "The Hokie Wallet story",
  description: "A four-minute tour of student money, dining, and the agents behind the plan.",
  robots: { index: false, follow: false },
};

export default function PresentationPage() {
  return <Presentation />;
}
