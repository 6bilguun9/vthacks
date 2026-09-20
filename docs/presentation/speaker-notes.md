# Hokie Wallet: four-minute speaker script

Carlos: 0:00–1:00. Neha: 1:00–2:00. Grant: 2:00–3:00. Bilguun: 3:00–4:00.

The 504-word speaking text below matches the browser presentation and its portable HTML export. Timing targets total 4:00. Rehearse with a timer to allow for handoffs and pauses. The older PowerPoint contains an earlier script and has not been updated to this version.

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

I’m Grant. Dining makes this specific to Hokies. Students enter their plan, remaining balances, weeks left, and preferences or schedule. Our dining backend asks our configured AI provider for a representative meal week, prioritizing included swipes and exchanges before dining dollars. It validates the response, recalculates costs from individual meals, and rejects estimates above the supplied balance. Prices remain estimates; students can check linked dining hours before going. This sample week shows the goal: use benefits already paid for before spending extra cash.

## Scene 7 — Grant (2:40–3:00 · 20 seconds)

Our backend brings together Nessie sandbox banking, student-entered campus balances, and a saved plan in Supabase. It keeps those sources distinct. Previews do not change the saved plan; students must explicitly save a revision. These workflows are implemented, while the dashboard’s authenticated connection and hosted provider verification remain unfinished.

## Scene 8 — Bilguun (3:00–3:40 · 40 seconds)

I’m Bilguun. Our Coach uses OpenRouter to structure a supported question, discovers the Planner through GoDaddy ANS, and sends a signed, authenticated request. The Planner calculates the comparison; the Coach explains it. This replay uses a separate synthetic contract example, not a live call: a hundred-fifty-dollar purchase uses fifty dollars of discretionary money and a hundred from the selected Laptop goal. Its projected completion moves from November sixteenth to November twenty-third: seven days later. Students see the trade-off before deciding to save a change.

## Scene 9 — Bilguun (3:40–4:00 · 20 seconds)

Our challenge contributions connect to that student benefit: Capital One’s Nessie adds banking context; GoDaddy ANS connects specialized agents; campus meal planning addresses Deloitte and Databricks’ student-experience theme. Hokie Wallet brings everyday choices into one plan, helping Hokies use today’s benefits while protecting tomorrow’s goals. Thank you.

## Presenter context — not spoken

- The product views use synthetic balances; FinBot replies are scripted. This presentation does not call the financial backend or establish a live account connection.
- Scene 8 replays the independent [Laptop goal contract fixture](https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/contracts/examples/scenario-goal-delay.json). Its baseline differs from the dashboard and dining examples. The $150 purchase uses $50 discretionary money and $100 from the explicitly selected goal. Its projected date changes from November 16 to November 23, 2026. Nothing is saved during the replay.
- Source implementation is not proof of hosted readiness. Verify the frontend guest session, configured providers, and an actual `ans_remote` response before describing a connected demo. The ANS call path is specific to Coach → Planner; dining is a separate selected-provider workflow.
- The three highlighted sponsor categories are [officially listed on Devpost](https://vthacks-14.devpost.com/). We describe the work’s fit, not guaranteed eligibility. No Databricks platform integration is claimed.
- Virginia Tech already provides [account balances and history](https://www.hokiepassport.vt.edu/pages/general.php?div2=account), a [DBD use guide and dining plan information](https://dining.vt.edu/plans_overview.html), and [financial education and coaching](https://well-being.vt.edu/finances.html). Our proposed benefit is coordinating daily choices across these different sources and rules.
