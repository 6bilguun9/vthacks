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
      "Hi, I’m Carlos. Together with Neha, Bilguun, and Grant, we built Hokie Wallet: a budgeting prototype that helps Hokies decide how to use their dining benefits, everyday cash, and savings.",
  },
  {
    id: "problem",
    title: "A balance tells you what’s left. What comes next?",
    speaker: "Carlos",
    startsAt: 15,
    duration: 20,
    eyebrow: "The student question",
    notes:
      "Virginia Tech already provides balances, transaction history, dining calculators, and financial coaching. Our problem is connecting those pieces to a daily decision: which benefit should cover lunch, and what money should I protect for later? Dining benefits have different rules, while bills and savings still need bank cash.",
  },
  {
    id: "overview",
    title: "See your money in context.",
    speaker: "Carlos",
    startsAt: 35,
    duration: 25,
    eyebrow: "Overview · Activity · Savings",
    notes:
      "Neha and I built the frontend around that decision. Overview puts bank cash, campus funds, and spending in context. Activity explains recent purchases; Savings shows progress toward a goal. These are sample balances. Campus funds stay separate from cash, and savings are reserved within bank cash, never counted twice.",
  },
  {
    id: "finbot",
    title: "A place to ask, then come back.",
    speaker: "Neha",
    startsAt: 60,
    duration: 35,
    eyebrow: "Ask FinBot",
    notes:
      "I’m Neha. FinBot gives students a familiar place to ask about their money instead of interpreting every number alone. I worked on saved conversations, renaming chats, and a multiline message box. Students can return to a question when their plans change. This frontend demonstration uses scripted replies. Later, we’ll show how the implemented backend separates understanding a question from calculating its financial impact.",
  },
  {
    id: "accessibility",
    title: "Your wallet. Your way to use it.",
    speaker: "Neha",
    startsAt: 95,
    duration: 25,
    eyebrow: "Built for different needs",
    notes:
      "Financial guidance should also be comfortable to use. Students can adjust text size, choose clearer color palettes, reduce motion, or listen to the current view. Ten language options translate core interface labels. These controls stay available in dining, keeping the same experience as students move from understanding their money to planning meals.",
  },
  {
    id: "dining",
    title: "Turn a dining balance into a week of meals.",
    speaker: "Grant",
    startsAt: 120,
    duration: 40,
    eyebrow: "Dining planner",
    notes:
      "I’m Grant. Dining turns a balance into a practical week. Students provide their dining plan, remaining funds, weeks left, and preferences. OpenRouter or VT ARC drafts meal suggestions; our backend then checks the structure, adds up each meal, and rejects a plan that exceeds the supplied campus balances. We ask for swipes and exchanges first. Prices remain estimates, and students can check current dining hours. Students can use what they already paid for while protecting cash for other needs.",
  },
  {
    id: "backend",
    title: "How the backend connects",
    speaker: "Grant",
    startsAt: 160,
    duration: 20,
    eyebrow: "How the backend connects",
    notes:
      "First, our API verifies the student’s guest token. It loads their Supabase plan, Nessie sandbox snapshot, and entered campus balances. Then it returns a calculated preview. The preview stays hypothetical until the student explicitly saves it. These backend steps are implemented; connecting them to the frontend remains unfinished.",
  },
  {
    id: "agents",
    title: "How Coach and Planner work together",
    speaker: "Bilguun",
    startsAt: 180,
    duration: 40,
    eyebrow: "Coach ↔ Planner",
    notes:
      "I’m Bilguun. For a purchase question, the Coach uses our selected AI provider to extract the amount, date, and goal. Missing details trigger a question. GoDaddy ANS locates the Planner, and a signed request carries the student’s authorization. The Planner uses financial code to compare the plan before and after; the Coach explains those numbers. Here, our synthetic example spends fifty dollars of discretionary money and one hundred from a Laptop goal. Its completion moves seven days later. Students understand the consequence before choosing to save.",
  },
  {
    id: "closing",
    title: "Use your benefits. Protect your goals.",
    speaker: "Bilguun",
    startsAt: 220,
    duration: 20,
    eyebrow: "Made for Hokies",
    notes:
      "These contributions fit three challenges: Capital One’s Nessie provides banking context; GoDaddy ANS connects specialized agents; dining guidance addresses Deloitte and Databricks’ Virginia Tech student-experience theme. We help Hokies choose today’s meal while protecting tomorrow’s bills and savings. Thank you.",
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
      "Official event and challenge guidance. This requested script targets four minutes; confirm the judges’ speaking-time allowance before presenting.",
  },
  {
    label: "VTHacks 14 official prize categories",
    href: "https://vthacks-14.devpost.com/",
    description:
      "Lists Capital One’s Best Use of Nessie, GoDaddy’s Best Use of ANS, and Deloitte × Databricks’ AI Agent for the Virginia Tech Student Experience. The presentation describes project contributions, not confirmed prize eligibility or Databricks platform integration.",
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
      "Backend architecture separates campus funds from bank cash and uses deterministic purchase comparisons. The diagram illustrates implemented code; live ANS verification is not confirmed.",
  },
  {
    label: "Backend activation and integration status",
    href: "https://github.com/6bilguun9/vthacks/blob/f3fffd09a48788218bfe1abd04e0a56697dedc91/docs/backend-handoff.md",
    description:
      "Hosted provider setup and frontend authenticated requests remain activation gates. Current presentation screens use sample balances and scripted FinBot replies.",
  },
] as const satisfies readonly PresentationSource[];
