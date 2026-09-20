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
    eyebrow: "Hokie Wallet · sudo win",
    notes:
      "Hi, I’m Carlos. We’re sudo win. We built Hokie Wallet so students can see their cash and campus balances together, then understand how today’s spending affects the savings they’re working toward.",
  },
  {
    id: "problem",
    title: "A balance tells you what’s left. What comes next?",
    speaker: "Carlos",
    startsAt: 15,
    duration: 20,
    eyebrow: "The student question",
    notes:
      "As Hokies, we keep checking different places for dining dollars, bank balances, and purchases. Those numbers still leave us asking: can I cover lunch and stay on track for a laptop? Virginia Tech offers useful tools. We’re bringing that daily planning into one place.",
  },
  {
    id: "overview",
    title: "See your money in context.",
    speaker: "Carlos",
    startsAt: 35,
    duration: 25,
    eyebrow: "Overview · Activity · Savings",
    notes:
      "Neha and I built the dashboard around that question. Overview brings balances and spending together. Activity shows purchases, and Savings tracks the goal. These screens use sample data. Dining dollars stay separate from bank cash, so a meal balance never looks like money available to pay rent. Neha will show FinBot.",
  },
  {
    id: "finbot",
    title: "A place to ask, then come back.",
    speaker: "Neha",
    startsAt: 60,
    duration: 35,
    eyebrow: "Ask FinBot",
    notes:
      "I’m Neha. A balance is easier to act on when you can ask a question. FinBot gives students that familiar conversation: “Would this purchase delay my goal?” I worked on returning to saved conversations and making chats easier to manage. The replies shown here are scripted. The connected interface is implemented, and we’ll explain how the backend checks the numbers behind an answer.",
  },
  {
    id: "accessibility",
    title: "Your wallet. Your way to use it.",
    speaker: "Neha",
    startsAt: 95,
    duration: 25,
    eyebrow: "Built for different needs",
    notes:
      "Financial guidance should be comfortable to use. Students can adjust text size, choose clearer color palettes, reduce motion, or listen to the current view. Ten language options translate core interface labels. Those controls stay available in dining. Grant will show how meal planning connects to the backend.",
  },
  {
    id: "dining",
    title: "Turn a dining balance into a week of meals.",
    speaker: "Grant",
    startsAt: 120,
    duration: 40,
    eyebrow: "Dining planner",
    notes:
      "I’m Grant. Dining starts with a student’s remaining funds, weeks, and preferences. The workflow we built asks an AI provider to draft a week. Our backend then checks payment methods, adds up meal estimates, and rejects suggestions that exceed those campus balances. Prioritizing swipes and exchanges can help preserve cash. This screen shows a sample plan, and meal prices still need checking. The goal is practical: use the dining benefits you’ve already paid for.",
  },
  {
    id: "backend",
    title: "How the backend connects",
    speaker: "Grant",
    startsAt: 160,
    duration: 20,
    eyebrow: "How the backend connects",
    notes:
      "Our API verifies a guest session, then loads the student’s saved Supabase plan and Nessie sandbox context. Campus balances are entered separately. Students preview changes before saving. The frontend connection is implemented. Hosted verification remains. Bilguun will explain how the agents use that context.",
  },
  {
    id: "agents",
    title: "How Coach and Planner work together",
    speaker: "Bilguun",
    startsAt: 180,
    duration: 40,
    eyebrow: "Coach ↔ Planner",
    notes:
      "I’m Bilguun. The Coach extracts the purchase details. GoDaddy ANS discovers the Planner, and our signed request design carries the student’s authorization. The Planner calculates the impact with financial code, then the Coach explains it. We’ve verified discovery, but the full hosted exchange still needs a live check. In this synthetic example, a hundred and fifty dollar purchase uses fifty dollars of spending money and one hundred from a Laptop goal. Its completion moves seven days later. The student sees that tradeoff before saving.",
  },
  {
    id: "closing",
    title: "Use your benefits. Protect your goals.",
    speaker: "Bilguun",
    startsAt: 220,
    duration: 20,
    eyebrow: "Made for Hokies",
    notes:
      "Capital One Nessie gives us banking context, and GoDaddy ANS gives our agents a discoverable connection. Together, they support the student question we started with: can I afford this today and still reach my goal? We’re sudo win. Thank you.",
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
    href: "https://www.hokiepassport.vt.edu/pages/general.php?div2=account",
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
      "The guide lists three minutes to present and one minute for questions. The default script preserves the requested four-minute talk. Use the separate three-minute rehearsal script unless the judges confirm four minutes of speaking time.",
  },
  {
    label: "VTHacks 14 official prize categories",
    href: "https://vthacks-14.devpost.com/",
    description:
      "Lists Capital One’s Best Use of Nessie, GoDaddy’s Best Use of ANS, and the Deloitte × Databricks student-experience challenge. The last challenge requires the Databricks platform. Our campus theme alone does not establish eligibility, and we have no verified Databricks integration.",
  },
  {
    label: "Synthetic Laptop goal comparison used in the replay",
    href: "https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/contracts/examples/scenario-goal-delay.json",
    description:
      "Independent synthetic contract fixture: $150 purchase funded by $50 discretionary money and $100 from the selected Laptop goal; projected completion moves from November 16 to November 23, 2026. It is not the dashboard profile, a live response, or a saved purchase.",
  },
  {
    label: "Server-selected AI provider",
    href: "https://github.com/6bilguun9/vthacks/blob/f3fffd09a48788218bfe1abd04e0a56697dedc91/backend/src/integrations/ai.ts",
    description:
      "The server selects VT ARC or OpenRouter for intent parsing and dining drafts. ARC is the configuration default; OpenRouter must be explicitly selected. A failure does not automatically switch providers.",
  },
  {
    label: "Coach parsing and grounded explanation",
    href: "https://github.com/6bilguun9/vthacks/blob/f3fffd09a48788218bfe1abd04e0a56697dedc91/backend/src/agents/service.ts",
    description:
      "The Coach validates structured intent, asks for missing details, and formats the Planner result. AI does not calculate the goal dates or generate a second free-form financial answer.",
  },
  {
    label: "Signed Coach-to-Planner request",
    href: "https://github.com/6bilguun9/vthacks/blob/f3fffd09a48788218bfe1abd04e0a56697dedc91/backend/src/integrations/planner-client.ts",
    description:
      "The request carries the guest bearer token and a signature over its audience, timestamp, nonce, and body. The Planner verifies the request; ANS discovery alone does not authorize student access.",
  },
  {
    label: "Authorized financial preview and save workflows",
    href: "https://github.com/6bilguun9/vthacks/blob/f3fffd09a48788218bfe1abd04e0a56697dedc91/backend/src/application/finance-api.ts",
    description:
      "Owner-scoped state feeds deterministic previews. An explicit save validates the current plan version and snapshot and creates a revision. Previewing a scenario does not mutate an account or saved plan.",
  },
  {
    label: "Project architecture and financial rules",
    href: "https://github.com/6bilguun9/vthacks/blob/f3fffd09a48788218bfe1abd04e0a56697dedc91/docs/architecture.md",
    description:
      "Backend architecture separates campus funds from bank cash and uses deterministic purchase comparisons. ANS discovery has been checked live. The full signed Coach-to-Planner exchange still needs hosted verification.",
  },
  {
    label: "Implemented frontend guest connection",
    href: "https://github.com/6bilguun9/vthacks/blob/31f34f61be024154350b00494477d038c5609eb7/frontend/src/features/session/financial-session.tsx",
    description:
      "The frontend implements explicit guest connection and authenticated state loading, with separate demo data. Hosted guest signup, presenter access, and an end-to-end save still need verification.",
  },
  {
    label: "Backend activation and integration status",
    href: "https://github.com/6bilguun9/vthacks/blob/31f34f61be024154350b00494477d038c5609eb7/docs/backend-handoff.md",
    description:
      "The frontend and backend connection is implemented. Hosted authentication, persistence, and AI execution remain verification gates. Presentation screens continue to use sample balances and scripted FinBot replies.",
  },
] as const satisfies readonly PresentationSource[];
