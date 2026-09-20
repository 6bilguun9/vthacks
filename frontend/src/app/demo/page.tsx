import { sampleDiningPlan } from "@/features/dining/sample";
import { MealCalendar } from "@/features/dining/meal-calendar";
import { DiningShell } from "@/features/dining/dining-shell";
import Link from "next/link";
export default function Demo() { return <DiningShell><div className="py-6"><p className="eyebrow">Quick demo · sample data</p><h1 className="mt-3 font-sans font-bold text-5xl tracking-tight">Jordan’s dining week</h1><div className="mt-6 flex flex-wrap gap-2">{["Unlimited plan","$225 DBD","$20 Hokie Passport","15 weeks left","Vegetarian"].map(x=><span key={x} className="rounded-full border bg-card px-3 py-1 text-xs">{x}</span>)}</div><MealCalendar plan={sampleDiningPlan} sample/><Link href="/dining" className="mt-8 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-white">Build a live plan →</Link></div></DiningShell>; }
