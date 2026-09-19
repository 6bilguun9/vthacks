import Link from "next/link";
import { Sprout } from "lucide-react";

export function DiningShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-7xl px-5 sm:px-10"><header className="flex items-center justify-between border-b py-6"><Link href="/" className="flex items-center gap-3 font-semibold"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white"><Sprout className="size-5"/></span>Student Savings Planner</Link><div className="flex gap-4"><Link href="/" className="text-sm font-semibold text-primary">Dashboard</Link><Link href="/demo" className="text-sm font-semibold text-primary">Quick demo →</Link></div></header>{children}<footer className="mt-16 flex flex-col justify-between gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row"><span>Built for students at VTHacks.</span><span>Unofficial project · Verify live dining information</span></footer></div>;
}
