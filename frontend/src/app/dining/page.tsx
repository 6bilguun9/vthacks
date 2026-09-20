import { DiningPlanner } from "@/features/dining/dining-planner";
import { DiningShell } from "@/features/dining/dining-shell";

export const metadata = { title: "Dining planner" };

export default function DiningPage() {
  return <DiningShell showIntro><DiningPlanner /></DiningShell>;
}
