import type { PresentationSceneId } from "./presentation-content";

// Explanations of the implemented API, not network activity from the slideshow.
export const backendSteps = [
  {
    label: "Verify guest",
    title: "The request belongs to one student",
    description: "The app sends a guest session token. The API verifies it before loading that guest’s financial plan.",
    outcome: "A student’s plan stays tied to their own session.",
    note: "Frontend session wiring is still pending.",
  },
  {
    label: "Load context",
    title: "Each kind of money keeps its purpose",
    description: "The API combines a bank snapshot with entered campus balances and a saved plan. Dining dollars stay separate from bank cash.",
    outcome: "Money reserved for rent is not confused with campus dining credit.",
    note: "Nessie supplies sandbox data. Campus balances are entered manually.",
  },
  {
    label: "Preview result",
    title: "The student sees the effect before saving",
    description: "The planning engine checks dated income, bills, the cash buffer, and goals. It returns cash-flow warnings and projected goal dates.",
    outcome: "A purchase can be compared against the plan before committing to it.",
    note: "A preview changes no saved plan or bank account.",
  },
  {
    label: "Save revision",
    title: "Saving requires the student’s decision",
    description: "After an explicit save, the API recalculates and checks the plan version. Supabase stores the revision only if the data is still current.",
    outcome: "An old preview cannot silently overwrite a newer plan.",
    note: "A saved purchase is a planned expense. No money moves.",
  },
] as const;

export type PresenterAnswer = { question: string; answer: string };

export const backendBriefings: Partial<Record<PresentationSceneId, readonly PresenterAnswer[]>> = {
  dining: [
    { question: "What does the AI do here?", answer: "The backend sends meal-plan inputs and preferences to one configured provider: OpenRouter or VT ARC. It asks for a representative week that prioritizes included benefits. The server then validates the structure, recalculates costs from the individual meals, and checks the supplied balance. These are estimated meals and prices, not a guarantee of current menu availability or every plan rule." },
    { question: "Does dining use the Coach and Planner agents?", answer: "Dining is a separate backend workflow that shares the AI provider adapter. The ANS-discovered Coach-to-Planner path handles financial purchase comparisons. It does not generate the dining calendar." },
    { question: "How does the calendar reach the screen?", answer: "The intended connection is a guest token and the dining form sent to POST /api/v1/dining-plans. The backend returns structured days, meals, costs, and a provider source label. The frontend renders those values. The current dining client still needs the guest authorization header, and the presentation shows a labeled sample calendar." },
  ],
  backend: [
    { question: "How will the frontend connect?", answer: "Create a Supabase guest session, then send its bearer token on private requests. For a new demo guest, explicitly initialize sample data with POST /api/v1/session/bootstrap and source set to fixture. GET /api/v1/overview loads the student’s state. POST /api/v1/plan/preview checks proposed edits, and POST /api/v1/scenarios compares a purchase. An explicit save calls POST /api/v1/plan/commit with the expected version, snapshot, and an idempotency key. These are the implemented interfaces, not requests made by this presentation." },
    { question: "Where does each balance come from?", answer: "Nessie refresh reads the configured sandbox customer’s banking records. Campus balances and university charges are student-entered, with source timestamps. Supabase stores guest-owned snapshots and plan revisions. The project does not connect to a Virginia Tech wallet API or move bank funds." },
    { question: "Why does the save step matter?", answer: "The server reloads authorized data and recalculates before saving. It rejects stale plan versions or snapshots, and repeated saves with the same idempotency key do not duplicate the change. The financial snapshot, campus funds, and planned expenses retain distinct meanings." },
  ],
  agents: [
    { question: "Why have a Coach and a Planner?", answer: "The Coach turns a supported question into structured intent using the configured AI provider. The Planner owns the financial calculation. Both have separate HTTP identities in the same Fastify deployment. This keeps language interpretation separate from repeatable calculations in integer cents." },
    { question: "What does GoDaddy ANS actually do?", answer: "ANS resolves the configured Planner identity and endpoint. The Coach sends a signed request containing the audience, body, timestamp, and single-use nonce, together with the guest token. The Planner checks the signature, expiry, replay protection, and student authorization before loading that student’s plan. ANS discovery itself does not authorize access to financial data." },
    { question: "Does the model invent the comparison or the explanation?", answer: "The planning engine supplies the dollar amounts and goal dates. The Coach formats its financial response from those validated results in code, rather than asking a model to invent numbers. Missing information prompts a clarification. Catch-up contribution amounts still need an affordability check." },
    { question: "Does every purchase delay a savings goal?", answer: "No. A purchase that fits the remaining discretionary allowance can leave the goal date unchanged. In our separate Laptop example, only $50 of the $150 purchase fits that allowance. The student selects the goal to cover the other $100, so the fixture projects seven extra days. The example is not the visitor’s financial position." },
    { question: "Is the new provider a fallback?", answer: "OpenRouter and VT ARC are explicit server configuration choices. ARC remains the default, and AI starts disabled until configured for authorized presenters. The backend does not automatically switch providers. Hosted provider and ANS success must be checked separately from source code or mocked tests." },
  ],
  closing: [
    { question: "Which contribution supports each challenge?", answer: "Capital One: the Nessie adapter supplies read-only sandbox banking context. GoDaddy: ANS discovers the Planner for signed Coach requests. Deloitte × Databricks: campus-specific dining and financial planning address the Virginia Tech student-experience theme. We do not claim Databricks platform integration or guaranteed prize eligibility." },
    { question: "What is the honest demo status?", answer: "Backend workflows are implemented. FinBot still uses scripted frontend replies, and the private frontend API flow needs guest session wiring. This deck replays synthetic examples. A successful health request does not verify Supabase, Nessie, the selected AI provider, or an actual ANS Planner call." },
  ],
};
