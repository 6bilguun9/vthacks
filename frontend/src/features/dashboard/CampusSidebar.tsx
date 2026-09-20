import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bot, ChevronRight, LayoutDashboard, PiggyBank, ReceiptText, Utensils, WalletCards } from "lucide-react";
import type { OverviewCopy } from "./overview-copy";

export type DashboardView = "main" | "activity" | "savings" | "finbot";
const navigation = [
  { view: "main", label: "Overview", Icon: LayoutDashboard },
  { view: "activity", label: "Activity", Icon: ReceiptText },
  { view: "savings", label: "Savings", Icon: PiggyBank },
  { view: "finbot", label: "FinBot", Icon: Bot },
] as const;

// Reuse one sidebar so navigation and branding stay consistent on every page.
export default function CampusSidebar({ activeView, labels, copy, onNavigate }: {
  activeView: DashboardView | "dining";
  labels: Record<DashboardView | "dining", string>;
  copy: OverviewCopy;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, view: DashboardView) => void;
}) {
  return (
    <aside className="sidebar">
      <Link className="brand" href={onNavigate ? "#main" : "/#main"} onClick={(event) => onNavigate?.(event, "main")} aria-label={copy.walletOverview}>
        <span className="brand-icon"><WalletCards aria-hidden="true" /></span>
        <span className="brand-text"><span className="brand-name">{copy.walletWordmark}</span><small>{copy.universityName}</small></span>
      </Link>
      <nav aria-label={copy.mainNavigation}>
        {navigation.map(({ view, Icon }) => (
          <Link key={view} className={activeView === view ? "nav-active" : undefined} href={`${onNavigate ? "" : "/"}#${view}`} onClick={(event) => onNavigate?.(event, view)} aria-current={activeView === view ? "page" : undefined}>
            <Icon aria-hidden="true" /><span>{labels[view]}</span>{activeView === view && <ChevronRight className="nav-chevron" aria-hidden="true" />}
          </Link>
        ))}
        <Link className={activeView === "dining" ? "nav-active" : undefined} href="/dining" aria-current={activeView === "dining" ? "page" : undefined}>
          <Utensils aria-hidden="true" /><span>{labels.dining}</span>{activeView === "dining" && <ChevronRight className="nav-chevron" aria-hidden="true" />}
        </Link>
      </nav>
      <div className="hokie-companion">
        <p className="hokie-speech">{copy.encouragement}</p>
        <Image src="/campus/hokiebird.jpg" alt={copy.birdAlt} width={850} height={566} sizes="240px" />
        <a className="photo-credit" href="https://www.archive.vtmag.vt.edu/fall18/HokieBirdGallery.php" target="_blank" rel="noreferrer">{copy.photoCredit}</a>
      </div>
      <div className="profile"><span className="avatar">H</span><strong>{copy.student}</strong></div>
    </aside>
  );
}
