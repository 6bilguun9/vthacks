import { DiningPlanner } from "@/features/dining/dining-planner";
import { DiningShell } from "@/features/dining/dining-shell";

export default function DiningPage() {
  return (
    <DiningShell>
      <div className="dining-view view-panel">
        <section className="dining-hero">
          <p className="eyebrow">CAMPUS DINING MEETS YOUR BUDGET</p>
          <h1>Make every meal—and dollar—count.</h1>
          <p>Build a school-year meal rhythm around your Virginia Tech plan, schedule, preferences, and restricted campus balances.</p>
        </section>
        <DiningPlanner />
      </div>
    </DiningShell>
  );
}
