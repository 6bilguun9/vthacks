import { DiningPlanner } from "@/features/dining/dining-planner";
import { DiningShell } from "@/features/dining/dining-shell";

export default function DiningPage() {
  return <DiningShell><main className="py-12 sm:py-16"><p className="eyebrow">Campus dining meets your budget</p><h1 className="mt-3 max-w-4xl font-serif text-5xl leading-none tracking-tight sm:text-7xl">Make every meal—and dollar—count.</h1><p className="mt-6 max-w-2xl leading-7 text-muted-foreground">Build a school-year meal rhythm around your Virginia Tech plan, schedule, preferences, and restricted campus balances.</p><DiningPlanner/></main></DiningShell>;
}
