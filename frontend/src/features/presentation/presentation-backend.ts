import type { PresentationSceneId } from "./presentation-content";

// Explanations of the implemented API, not network activity from the slideshow.
export const backendSteps = [
  {
    label: "Verify guest",
    title: "The request belongs to one student",
    description: "The app sends a guest session token. The API verifies it before loading that guest’s financial plan.",
    outcome: "A student’s plan stays tied to their own session.",
    note: "Guest session wiring is implemented. Hosted sign-in still needs verification.",
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
    { question: "How does the calendar reach the screen?", answer: "The connected frontend sends its guest token and dining form to POST /api/v1/dining-plans. The backend returns structured days, meals, costs, and a provider source label. The client renders those values only for an authorized presenter session. That connection is implemented, while hosted sign-in and a successful live AI request still need verification. This presentation shows a labeled sample calendar." },
  ],
  backend: [
    { question: "How does the frontend connect?", answer: "The frontend starts or restores a Supabase guest session and sends its bearer token on private requests. A new guest explicitly initializes sample data with POST /api/v1/session/bootstrap and source set to fixture. GET /api/v1/overview loads their state. POST /api/v1/plan/preview checks proposed edits, and POST /api/v1/scenarios compares a purchase. An explicit save calls POST /api/v1/plan/commit with the expected version, snapshot, and an idempotency key. Both sides of these interfaces are implemented. Hosted end-to-end verification is still pending, and this presentation makes no financial requests." },
    { question: "Where does each balance come from?", answer: "Nessie refresh reads the configured sandbox customer’s banking records. Campus balances and university charges are student-entered, with source timestamps. Supabase stores guest-owned snapshots and plan revisions. The project does not connect to a Virginia Tech wallet API or move bank funds." },
    { question: "Why does the save step matter?", answer: "The server reloads authorized data and recalculates before saving. It rejects stale plan versions or snapshots, and repeated saves with the same idempotency key do not duplicate the change. The financial snapshot, campus funds, and planned expenses retain distinct meanings." },
  ],
  agents: [
    { question: "Why have a Coach and a Planner?", answer: "The Coach turns a supported question into structured intent using the configured AI provider. The Planner owns the financial calculation. Both have separate HTTP identities in the same Fastify deployment. This keeps language interpretation separate from repeatable calculations in integer cents." },
    { question: "What does GoDaddy ANS actually do?", answer: "ANS resolves the configured Planner identity and endpoint; we verified that discovery against the service. Our implemented Coach call signs the audience, body, timestamp, and single-use nonce, and includes the guest token. The Planner checks the signature, expiry, replay protection, and student authorization before loading that student’s plan. Discovery does not authorize financial access. The full signed remote exchange still needs a successful live verification." },
    { question: "Does the model invent the comparison or the explanation?", answer: "The planning engine supplies the dollar amounts and goal dates. The Coach formats its financial response from those validated results in code, rather than asking a model to invent numbers. Missing information prompts a clarification. Catch-up contribution amounts still need an affordability check." },
    { question: "Does every purchase delay a savings goal?", answer: "No. A purchase that fits the remaining discretionary allowance can leave the goal date unchanged. In our separate Laptop example, only $50 of the $150 purchase fits that allowance. The student selects the goal to cover the other $100, so the fixture projects seven extra days. The example is not the visitor’s financial position." },
    { question: "Is the new provider a fallback?", answer: "OpenRouter and VT ARC are explicit server configuration choices. ARC remains the default, and AI starts disabled until configured for authorized presenters. The backend does not automatically switch providers. Hosted provider and ANS success must be checked separately from source code or mocked tests." },
  ],
  closing: [
    { question: "Which contribution supports each challenge?", answer: "Capital One: our Nessie adapter retrieved sandbox accounts and purchases. GoDaddy: ANS Planner discovery is verified, and signed Coach requests are implemented but still need a complete live test. The campus planning problem also relates to Deloitte and Databricks’ student-experience theme, but that track expects Databricks use, which this prototype does not implement. Accessibility and the student-centered workflow support our UI/UX and student-service story. Prize eligibility remains the judges’ decision." },
    { question: "What can we demonstrate today?", answer: "The portable presentation and public product demo use labeled synthetic examples. Frontend guest sessions, authenticated planning, chat, and dining requests are implemented. We verified read-only Nessie retrieval of two sandbox accounts and four purchases, and ANS resolution of the Planner endpoint. The deterministic calculation engine runs independently of AI. Hosted guest sign-in, saved-state isolation, successful AI generation, and the full signed ANS exchange still need end-to-end verification." },
    { question: "Why is this useful beyond transaction history?", answer: "A student can see where their money belongs and compare a decision before spending. Restricted dining funds cannot pay a bank bill, and goal allocations already belong to the cash balance. The Planner accounts for those distinctions when projecting what a purchase changes. That is the practical value we want to test with fellow Hokies; we have not measured savings or claimed that the app finds an optimal meal plan." },
  ],
};
