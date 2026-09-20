import { DiningPlanner } from "@/features/dining/dining-planner";
import { DiningShell } from "@/features/dining/dining-shell";

export default function DiningPage() {
  return (
    <DiningShell>
      <DiningPlanner />
    </DiningShell>
  );
}
