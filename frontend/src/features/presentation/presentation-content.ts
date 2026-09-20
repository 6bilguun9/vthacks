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
      "I’m Grant. Dining makes this specific to Hokies. Students enter their plan, remaining balances, weeks left, and preferences or schedule. Our dining backend asks VT ARC for a representative meal week, prioritizing included swipes and exchanges before dining dollars. It validates the response, recalculates costs from individual meals, and rejects estimates above the supplied balance. Prices remain estimates; students can check linked dining hours before going. This sample week shows the goal: use benefits already paid for before spending extra cash.",
  },
  {
    id: "backend",
    title: "Student inputs. A plan you can check.",
    speaker: "Grant",
    startsAt: 160,
    duration: 20,
    eyebrow: "How the backend connects",
    notes:
      "Our backend brings together Nessie sandbox banking, student-entered campus balances, and a saved plan in Supabase. It keeps those sources distinct. Previews do not change the saved plan; students must explicitly save a revision. These workflows are implemented, while the dashboard’s authenticated connection and hosted provider verification remain unfinished.",
  },
  {
    id: "agents",
    title: "Ask a question. See what changes.",
    speaker: "Bilguun",
    startsAt: 180,
    duration: 40,
    eyebrow: "Coach ↔ Planner",
    notes:
      "I’m Bilguun. Our Coach uses VT ARC to structure a supported question, discovers the Planner through GoDaddy ANS, and sends a signed, authenticated request. The Planner calculates the comparison; the Coach explains it. This replay uses a separate synthetic contract example, not a live call: a hundred-fifty-dollar purchase uses fifty dollars of discretionary money and a hundred from the selected Laptop goal. Its projected completion moves from November sixteenth to November twenty-third: seven days later. Students see the trade-off before deciding to save a change.",
  },
  {
    id: "closing",
    title: "Use your benefits. Protect your goals.",
    speaker: "Bilguun",
    startsAt: 220,
    duration: 20,
    eyebrow: "Made for Hokies",
    notes:
      "Our challenge contributions connect to that student benefit: Capital One’s Nessie adds banking context; GoDaddy ANS connects specialized agents; campus meal planning addresses Deloitte and Databricks’ student-experience theme. Hokie Wallet brings everyday choices into one plan, helping Hokies use today’s benefits while protecting tomorrow’s goals. Thank you.",
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
    label: "Project architecture and financial rules",
    href: "https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/docs/architecture.md",
    description:
      "Backend architecture separates campus funds from bank cash and uses deterministic purchase comparisons. The diagram illustrates implemented code; live ANS verification is not confirmed.",
  },
  {
    label: "Backend activation and integration status",
    href: "https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/docs/backend-handoff.md",
    description:
      "Hosted provider setup and frontend authenticated requests remain activation gates. Current presentation screens use sample balances and scripted FinBot replies.",
  },
] as const satisfies readonly PresentationSource[];
