export type PresentationSpeaker = "Carlos" | "Neha" | "Grant" | "Bilguun";

export type PresentationSceneId =
  | "intro"
  | "problem"
  | "overview"
  | "finbot"
  | "accessibility"
  | "dining"
  | "backend"
  | "agents"
  | "closing";

export type PresentationScene = {
  id: PresentationSceneId;
  title: string;
  speaker: PresentationSpeaker;
  startsAt: number;
  duration: number;
  notes: string;
  eyebrow: string;
};

export const totalPresentationSeconds = 240;

// Keep the speaking text aligned with docs/presentation/speaker-notes.md.
// Durations are rehearsal targets; playback does not establish a live integration.
export const presentationScenes = [
  {
    id: "intro",
    title: "Make your dining money last.",
    speaker: "Carlos",
    startsAt: 0,
    duration: 15,
    eyebrow: "Hokie Wallet · sudoWin",
    notes:
      "Hi, I’m Carlos. Together with Neha, Bilguun, and Grant, we built Hokie Wallet: a student budgeting prototype that helps Hokies plan everyday spending and make their dining money last.",
  },
  {
    id: "problem",
    title: "A balance tells you what’s left. What comes next?",
    speaker: "Carlos",
    startsAt: 15,
    duration: 20,
    eyebrow: "The student question",
    notes:
      "Virginia Tech lets us check balances and transaction history, and offers budgeting resources. But a balance still leaves a practical question: what should I spend today? We want to connect dining choices with everyday spending and savings, so students can plan ahead.",
  },
  {
    id: "overview",
    title: "See your money in context.",
    speaker: "Carlos",
    startsAt: 35,
    duration: 25,
    eyebrow: "Overview · Activity · Savings",
    notes:
      "Neha and I built the frontend around that decision. Overview brings bank cash, restricted campus funds, and monthly spending together. Activity helps explain spending patterns, while Savings shows progress toward a goal. We keep campus funds separate from cash so the numbers do not suggest money you can spend anywhere.",
  },
  {
    id: "finbot",
    title: "A place to ask, then come back.",
    speaker: "Neha",
    startsAt: 60,
    duration: 35,
    eyebrow: "Ask FinBot",
    notes:
      "I’m Neha. FinBot gives students a familiar place to ask about their money instead of interpreting every number themselves. I worked on the chat experience, including saved conversations, renaming chats, and a multiline message box. A student can return to a question as their plans change. The current demonstration uses scripted replies and sample balances. Bilguun will explain the backend coach and planner that are ready for the next integration step.",
  },
  {
    id: "accessibility",
    title: "Your wallet. Your way to use it.",
    speaker: "Neha",
    startsAt: 95,
    duration: 25,
    eyebrow: "Built for different needs",
    notes:
      "We also wanted students to use this comfortably. They can adjust text size, choose clearer color palettes, reduce motion, or listen to the current view. Ten language options translate core interface labels. These controls stay available in dining, so students do not lose their preferences when they switch tasks.",
  },
  {
    id: "dining",
    title: "Turn a dining balance into a week of meals.",
    speaker: "Grant",
    startsAt: 120,
    duration: 40,
    eyebrow: "Dining planner",
    notes:
      "I’m Grant. Dining makes this useful for Hokies. Students enter their meal plan, balance, weeks left, and preferences or class schedule. Our dining backend asks VT ARC for a representative week of meals, prioritizing included swipes and exchanges before dining dollars. It checks the response and recalculates costs from the individual meals. It rejects estimates that exceed the supplied balance. Prices remain estimates, with current hours linked, so students can check before they go. The goal is to use the benefits they already paid for.",
  },
  {
    id: "backend",
    title: "The plan behind the screen.",
    speaker: "Grant",
    startsAt: 160,
    duration: 20,
    eyebrow: "How the backend connects",
    notes:
      "Behind the screens, our API combines a saved financial plan with Nessie sandbox banking data and student-entered campus balances. Supabase stores each guest’s state. Those backend workflows are implemented. The dashboard’s authenticated connection is still in progress, which is why these screens show sample data.",
  },
  {
    id: "agents",
    title: "Two agents. One clearer trade-off.",
    speaker: "Bilguun",
    startsAt: 180,
    duration: 40,
    eyebrow: "Coach ↔ Planner",
    notes:
      "I’m Bilguun. Our coach and planner have different jobs. VT ARC turns a supported money question into a structured request. For a purchase comparison, the coach discovers our planner through GoDaddy ANS, then sends a signed, authenticated message. The planner uses deterministic calculations to compare cash flow and savings goals before and after that purchase. It returns the comparison, and the coach explains it in plain language. This helps students understand a trade-off before spending. Previewing a scenario never changes the saved plan.",
  },
  {
    id: "closing",
    title: "Spend with a plan for tomorrow.",
    speaker: "Bilguun",
    startsAt: 220,
    duration: 20,
    eyebrow: "Made for Hokies",
    notes:
      "That connects our work to the challenges: Nessie supplies banking context, ANS enables agent discovery, and campus dining planning fits Deloitte and Databricks’ student-experience theme. Our goal is straightforward: help Hokies understand what they can afford today while protecting what they need tomorrow. Thank you.",
  },
] as const satisfies readonly PresentationScene[];

export type PresentationSource = {
  label: string;
  href: string;
  description: string;
};

// Official context and project evidence, kept outside the audience's main story.
// Source implementation is not evidence of a successful hosted provider call.
export const sourceLinks = [
  {
    label: "Virginia Tech balances and transaction history",
    href: "https://www.hokiepassport.vt.edu/pages/FAQ.php?div2=Student",
    description:
      "Hokie Passport Services lets students view balances and history. The presentation does not claim these services are missing.",
  },
  {
    label: "Virginia Tech dining plans and DBD use guide",
    href: "https://dining.vt.edu/plans_overview.html",
    description:
      "Official dining information includes a Declining Balance Dollar Use Guide Calculator. Meal prices in our demonstration remain estimates.",
  },
  {
    label: "Virginia Tech financial wellness resources",
    href: "https://well-being.vt.edu/finances.html",
    description:
      "Virginia Tech already offers financial education, workshops, and coaching. Our prototype brings everyday planning into one interface.",
  },
  {
    label: "VTHacks 14 organizer guide",
    href: "https://vthacks.com/guide",
    description:
      "Official event and challenge guidance. This requested script targets four minutes; confirm the judges’ speaking-time allowance before presenting.",
  },
  {
    label: "Project architecture and financial rules",
    href: "https://github.com/6bilguun9/vthacks/blob/4f4b386879921525610f2c14f261ddca0b6cee0c/docs/architecture.md",
    description:
      "Backend architecture separates campus funds from bank cash and uses deterministic purchase comparisons. The diagram illustrates implemented code; live ANS verification is not confirmed.",
  },
  {
    label: "Backend activation and integration status",
    href: "https://github.com/6bilguun9/vthacks/blob/4f4b386879921525610f2c14f261ddca0b6cee0c/docs/backend-handoff.md",
    description:
      "Hosted provider setup and frontend authenticated requests remain activation gates. Current presentation screens use sample balances and scripted FinBot replies.",
  },
] as const satisfies readonly PresentationSource[];
