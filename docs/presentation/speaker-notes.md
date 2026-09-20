# Hokie Wallet: four-minute speaker script

Carlos: 0:00–1:00. Neha: 1:00–2:00. Grant: 2:00–3:00. Bilguun: 3:00–4:00.

The 495-word speaking text below matches the browser presentation and its portable HTML export. Timing targets total 4:00. Rehearse with a timer to allow for handoffs and pauses. The older PowerPoint contains an earlier script and has not been updated to this version.

## Scene 1 — Carlos (0:00–0:15 · 15 seconds)

Hi, I’m Carlos. Together with Neha, Bilguun, and Grant, we built Hokie Wallet: a budgeting prototype that helps Hokies decide how to use their dining benefits, everyday cash, and savings.

## Scene 2 — Carlos (0:15–0:35 · 20 seconds)

Virginia Tech already provides balances, transaction history, dining calculators, and financial coaching. Our problem is connecting those pieces to a daily decision: which benefit should cover lunch, and what money should I protect for later? Dining benefits have different rules, while bills and savings still need bank cash.

## Scene 3 — Carlos (0:35–1:00 · 25 seconds)

Neha and I built the frontend around that decision. Overview puts bank cash, campus funds, and spending in context. Activity explains recent purchases; Savings shows progress toward a goal. These are sample balances. Campus funds stay separate from cash, and savings are reserved within bank cash, never counted twice.

## Scene 4 — Neha (1:00–1:35 · 35 seconds)

I’m Neha. FinBot gives students a familiar place to ask about their money instead of interpreting every number alone. I worked on saved conversations, renaming chats, and a multiline message box. Students can return to a question when their plans change. This frontend demonstration uses scripted replies. Later, we’ll show how the implemented backend separates understanding a question from calculating its financial impact.

## Scene 5 — Neha (1:35–2:00 · 25 seconds)

Financial guidance should also be comfortable to use. Students can adjust text size, choose clearer color palettes, reduce motion, or listen to the current view. Ten language options translate core interface labels. These controls stay available in dining, keeping the same experience as students move from understanding their money to planning meals.

## Scene 6 — Grant (2:00–2:40 · 40 seconds)

I’m Grant. Dining turns a balance into a practical week. Students provide their dining plan, remaining funds, weeks left, and preferences. OpenRouter or VT ARC drafts meal suggestions; our backend then checks the structure, adds up each meal, and rejects a plan that exceeds the supplied campus balances. We ask for swipes and exchanges first. Prices remain estimates, and students can check current dining hours. Students can use what they already paid for while protecting cash for other needs.

## Scene 7 — Grant (2:40–3:00 · 20 seconds)

First, our API verifies the student’s guest token. It loads their Supabase plan, Nessie sandbox snapshot, and entered campus balances. Then it returns a calculated preview. The preview stays hypothetical until the student explicitly saves it. These backend steps are implemented; connecting them to the frontend remains unfinished.

## Scene 8 — Bilguun (3:00–3:40 · 40 seconds)

I’m Bilguun. For a purchase question, the Coach uses our selected AI provider to extract the amount, date, and goal. Missing details trigger a question. GoDaddy ANS locates the Planner, and a signed request carries the student’s authorization. The Planner uses financial code to compare the plan before and after; the Coach explains those numbers. Here, our synthetic example spends fifty dollars of discretionary money and one hundred from a Laptop goal. Its completion moves seven days later. Students understand the consequence before choosing to save.

## Scene 9 — Bilguun (3:40–4:00 · 20 seconds)

These contributions fit three challenges: Capital One’s Nessie provides banking context; GoDaddy ANS connects specialized agents; dining guidance addresses Deloitte and Databricks’ Virginia Tech student-experience theme. We help Hokies choose today’s meal while protecting tomorrow’s bills and savings. Thank you.

## Presenter context — not spoken

- The product views use synthetic balances; FinBot replies are scripted. This presentation does not call the financial backend or establish a live account connection.
- Scene 8 replays the independent [Laptop goal contract fixture](https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/contracts/examples/scenario-goal-delay.json). Its baseline differs from the dashboard and dining examples. The $150 purchase uses $50 discretionary money and $100 from the explicitly selected goal. Its projected date changes from November 16 to November 23, 2026. Nothing is saved during the replay.
- Scene 7 shows the implemented API sequence: verify the guest token → load the student's owner-scoped plan and financial snapshot → return a deterministic preview → save a versioned revision only after an explicit action. The Nessie snapshot is read-only sandbox context; campus balances are manually entered. The diagram is an explanation of the connection to build, not a live request from the slides.
- Scene 8 separates five responsibilities: AI parses a supported intent; ANS discovers the configured Planner; the signed request authenticates the Coach invocation alongside the student's bearer token; deterministic financial code calculates the comparison; the Coach formats an explanation from those results. The Coach does not use a second AI call to invent or rewrite the financial numbers. Goal dates and affordability remain backend calculations.
- The current backend supports server-selected VT ARC or OpenRouter. `AI_PROVIDER` defaults to `arc`; `openrouter` must be explicitly selected with its own server-only credential. Provider failures do not automatically switch to the other provider. No live provider selection is inferred from the repository or presentation.
- Dining is a separate suggestion-and-validation workflow. The AI drafts a representative week; backend code checks its shape and permitted payment methods and recomputes projected campus spending from meal estimates. Asking it to prioritize swipes and exchanges is not proof of globally optimal dining allocation. Meal prices, menus, availability, and dietary suitability still need student verification.
- Source implementation is not proof of hosted readiness. Verify the frontend guest session, configured providers, and an actual `ans_remote` response before describing a connected demo. The ANS call path is specific to Coach → Planner; dining is a separate selected-provider workflow.
- The three highlighted sponsor categories are [officially listed on Devpost](https://vthacks-14.devpost.com/). We describe the work’s fit, not guaranteed eligibility. No Databricks platform integration is claimed.
- Virginia Tech already provides [account balances and history](https://www.hokiepassport.vt.edu/pages/general.php?div2=account), a [DBD use guide and dining plan information](https://dining.vt.edu/plans_overview.html), and [financial education and coaching](https://well-being.vt.edu/finances.html). Our proposed benefit is coordinating daily choices across these different sources and rules.
