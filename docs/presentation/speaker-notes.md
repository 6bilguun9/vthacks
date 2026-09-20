# Hokie Wallet: speaker notes

Team: **sudo win**. Carlos and Neha built the frontend. Grant and Bilguun built the backend.

## Choose the right timing

The [organizer guide](https://vthacks.com/guide) lists **three minutes to present and one minute for questions**. The presentation preserves the requested four-minute default. Use the [three-minute version below](#three-minute-rehearsal-script) for judging unless an organizer explicitly gives you four minutes to speak.

The four-minute speaking text matches the browser presentation and portable HTML export: 478 words, about 120 words per minute. Carlos, Neha, Grant, and Bilguun each have one minute. The older PowerPoint has an earlier script.

## Four-minute speaking script

### Scene 1 — Carlos (0:00–0:15 · 15 seconds)

Hi, I’m Carlos. We’re sudo win. We built Hokie Wallet so students can see their cash and campus balances together, then understand how today’s spending affects the savings they’re working toward.

### Scene 2 — Carlos (0:15–0:35 · 20 seconds)

As Hokies, we keep checking different places for dining dollars, bank balances, and purchases. Those numbers still leave us asking: can I cover lunch and stay on track for a laptop? Virginia Tech offers useful tools. We’re bringing that daily planning into one place.

### Scene 3 — Carlos (0:35–1:00 · 25 seconds)

Neha and I built the dashboard around that question. Overview brings balances and spending together. Activity shows purchases, and Savings tracks the goal. These screens use sample data. Dining dollars stay separate from bank cash, so a meal balance never looks like money available to pay rent. Neha will show FinBot.

### Scene 4 — Neha (1:00–1:35 · 35 seconds)

I’m Neha. A balance is easier to act on when you can ask a question. FinBot gives students that familiar conversation: “Would this purchase delay my goal?” I worked on returning to saved conversations and making chats easier to manage. The replies shown here are scripted. The connected interface is implemented, and we’ll explain how the backend checks the numbers behind an answer.

### Scene 5 — Neha (1:35–2:00 · 25 seconds)

Financial guidance should be comfortable to use. Students can adjust text size, choose clearer color palettes, reduce motion, or listen to the current view. Ten language options translate core interface labels. Those controls stay available in dining. Grant will show how meal planning connects to the backend.

### Scene 6 — Grant (2:00–2:40 · 40 seconds)

I’m Grant. Dining starts with a student’s remaining funds, weeks, and preferences. The workflow we built asks an AI provider to draft a week. Our backend then checks payment methods, adds up meal estimates, and rejects suggestions that exceed those campus balances. Prioritizing swipes and exchanges can help preserve cash. This screen shows a sample plan, and meal prices still need checking. The goal is practical: use the dining benefits you’ve already paid for.

### Scene 7 — Grant (2:40–3:00 · 20 seconds)

Our API verifies a guest session, then loads the student’s saved Supabase plan and Nessie sandbox context. Campus balances are entered separately. Students preview changes before saving. The frontend connection is implemented. Hosted verification remains. Bilguun will explain how the agents use that context.

### Scene 8 — Bilguun (3:00–3:40 · 40 seconds)

I’m Bilguun. The Coach extracts the purchase details. GoDaddy ANS discovers the Planner, and our signed request design carries the student’s authorization. The Planner calculates the impact with financial code, then the Coach explains it. We’ve verified discovery, but the full hosted exchange still needs a live check. In this synthetic example, a hundred and fifty dollar purchase uses fifty dollars of spending money and one hundred from a Laptop goal. Its completion moves seven days later. The student sees that tradeoff before saving.

### Scene 9 — Bilguun (3:40–4:00 · 20 seconds)

Capital One Nessie gives us banking context, and GoDaddy ANS gives our agents a discoverable connection. Together, they support the student question we started with: can I afford this today and still reach my goal? We’re sudo win. Thank you.

## Three-minute rehearsal script

Use the same nine scenes and advance manually with the right arrow. **Do not start the automatic four-minute timer.** Each speaker has 45 seconds. This version has 324 words, about 108 words per minute, leaving room for pointing and handoffs. Open on scene 1, close the notes, and assign one teammate to advance the slides.

Manual scene navigation also pauses the within-scene reveals. Use a separate stopwatch and these visible controls so the audience sees the examples when the speaker describes them:

| Scene | Operator cue |
| --- | --- |
| 4, FinBot | Click **Show FinBot’s example reply** as Neha introduces the example. |
| 6, Dining | Show the inputs first, then click **Reveal the sample week** before Grant says “This is a sample week.” |
| 7, Backend | Start on **Verify guest**, then click **Load context**, **Preview result**, and **Save revision** as Grant names those actions. |
| 8, Agents | Click the numbered steps **1 Understand**, **2 Discover**, and **3 Authenticate** with Bilguun’s explanation. Click **4 Compare** when he introduces the synthetic purchase, then **5 Explain**. Leave step 5 visible for the seven-day result before advancing to the closing. The round **Next agent flow step** button also advances these steps. |

### Short scene 1 — Carlos (0:00–0:12)

Hi, I’m Carlos. We’re sudo win. Hokie Wallet brings cash and campus balances together so students can understand how today’s spending affects tomorrow’s savings.

### Short scene 2 — Carlos (0:12–0:26)

As Hokies, we check several places for our money. The daily question remains: can I pay for lunch and still reach my savings goal?

### Short scene 3 — Carlos (0:26–0:45)

Our sample dashboard puts that decision in context. Overview shows balances, Activity shows purchases, and Savings tracks goals. Dining funds stay separate from bank cash. Neha will show how students ask about a decision.

### Short scene 4 — Neha (0:45–1:10)

I’m Neha. FinBot gives students a familiar way to ask, “Would this purchase delay my goal?” I worked on saved conversations and easier chat management. This replay uses scripted answers. The connected interface is implemented, with hosted verification still ahead.

### Short scene 5 — Neha (1:10–1:30)

Students can adjust text size, choose clearer palettes, reduce motion, and hear the current view. Ten language options translate core labels. These controls continue into dining. Grant will explain how a meal plan uses that context.

### Short scene 6 — Grant (1:30–1:55)

I’m Grant. Our dining workflow asks AI for a meal plan, then backend code checks payment methods and recomputes the estimated spending. It rejects plans that exceed the supplied campus balances. This is a sample week. The aim is to use prepaid benefits while preserving cash.

### Short scene 7 — Grant (1:55–2:15)

Our API verifies a guest, loads their Supabase plan and Nessie sandbox context, and returns a calculated preview. Campus balances are entered manually. An explicit save records the change. Bilguun will explain the agent design.

### Short scene 8 — Bilguun (2:15–2:45)

I’m Bilguun. The Coach extracts purchase details. GoDaddy ANS discovers the Planner. Our signed request design carries the student’s authorization, and financial code calculates the impact. Discovery is verified, while the full exchange still needs a live check. This synthetic hundred and fifty dollar purchase moves a Laptop goal seven days later. The student sees the tradeoff before saving.

### Short scene 9 — Bilguun (2:45–3:00)

We’ve brought daily spending and future goals into one student experience. Hokies can understand the effect of a choice before spending. We’re sudo win. Thank you.

## Presenter context — not spoken

### What the audience is seeing

- The slideshow is a prepared product demonstration. Product balances are synthetic, FinBot replies are scripted, and dining shows a sample week. It makes no live financial or AI request.
- Scene 8 replays the independent [Laptop goal contract fixture](https://github.com/6bilguun9/vthacks/blob/2bbffe8a62dfaba788d19f2e814c15501e312ece/contracts/examples/scenario-goal-delay.json). Its baseline differs from the dashboard and dining examples. The $150 purchase uses $50 of discretionary money and $100 from the explicitly selected Laptop goal. Its projected completion changes from November 16 to November 23, 2026. Nothing is saved during the replay.
- Keep that example separate from the dashboard profile. Do not compare their balances or treat the replay as a current student account. The seven-day change illustrates the effect of an assumed purchase, not a promise about future savings.

### What is implemented and what has been verified

- Both applications implement the guest connection: the frontend obtains a session, the backend independently verifies its token, and authenticated requests load the student's plan and financial snapshot. A preview stays hypothetical. Only an explicit, versioned save records a plan revision. Hosted signup, two-guest isolation, and the full save flow still need verification.
- A read-only live Nessie sandbox check retrieved two accounts and four purchases. These are sandbox records, not real student banking data. Refreshing a snapshot does not move money. Campus balances remain separate manual inputs.
- A live GoDaddy ANS lookup resolved the configured Planner endpoint. The implemented signed Coach-to-Planner path also carries the student's bearer token. Discovery alone does not prove that full exchange succeeded or authorize access to a student's data.
- Supabase authentication, storage, and owner isolation are implemented. A service-side read and schema check succeeded. That does not establish a complete hosted guest session or save.
- The backend supports explicitly selected VT ARC or OpenRouter. The latest ARC request returned 403, and an OpenRouter credential was not configured. No live AI answer or dining generation was verified. Neither the slideshow nor the scripted demo demonstrates provider execution.
- The Coach parses a supported question into structured intent and asks for missing details. The Planner calculates amounts and dates in integer cents. The Coach formats those results without a second AI call that could change the numbers.
- Dining follows a separate suggestion-and-validation workflow. Backend code checks the draft's structure and permitted payment methods, recomputes estimated spending, and rejects plans exceeding the supplied dining or Passport funds. Asking AI to prefer swipes and exchanges does not establish an optimal allocation or enforce every dining rule. Students still need to verify prices, menus, hours, and dietary suitability.

### Likely questions

**“How is this different from the existing Hokie Wallet?”**

Virginia Tech already provides [balances and history](https://www.hokiepassport.vt.edu/pages/general.php?div2=account), a [DBD use guide and dining information](https://dining.vt.edu/plans_overview.html), and [financial education and coaching](https://well-being.vt.edu/finances.html). Our independent student prototype puts planning around a daily choice: how does spending today affect the money I need later? It does not connect to official VT accounts or claim university affiliation.

**“What actually works on the backend?”**

The financial calculation engine, validation, and authenticated request paths are implemented and covered by automated tests. We also verified live read-only Nessie retrieval and ANS discovery. The remaining proof is a complete hosted student session through preview, save, and a successful provider-backed answer. Local or mocked tests do not establish that hosted result.

**“Why use two agents?”**

The Coach handles the question and explanation. The Planner handles financial calculations. This keeps language interpretation separate from the amounts and dates, and ANS lets the Coach discover the configured Planner. The full signed remote exchange remains to be verified live.

**“Does it move money or decide for me?”**

No. It reads sandbox data and compares hypothetical choices. A save records a plan revision only. The student decides whether to make a purchase.

**“Which sponsor work can you show?”**

Capital One Nessie supplies read-only sandbox banking context. GoDaddy ANS supplies Planner discovery, with the signed invocation path implemented. Deloitte × Databricks' campus theme matches our student problem, but its challenge requires the Databricks platform and we have no verified Databricks integration. Do not claim qualification from the theme alone. See the [official categories](https://vthacks-14.devpost.com/) and [organizer guide](https://vthacks.com/guide).

**“Does accessibility cover everyone?”**

We provide adjustable text, alternate color palettes, reduced motion, browser speech, and translated core labels. Those are useful choices, not a claim of complete accessibility certification or translation of every AI response.

## Rehearsal and demo handoff

1. Use the portable HTML as the primary presentation. It embeds the images and fonts and does not depend on the backend. Keep a local copy on the presenting laptop.
2. Choose the three-minute or four-minute script before starting. Rehearse once with the person advancing the slides. Leave the final minute for questions if the organizer uses the three-plus-one format.
3. Each speaker begins with their name. Carlos hands off to Neha, Neha to Grant, and Grant to Bilguun. Bilguun finishes the student question and thank-you without adding another technical section.
4. Pause briefly on the seven-day goal change. That is the concrete consequence the student can understand. Avoid reading every diagram label.
5. Keep the notes dialog closed on the audience screen. If asked for a live product walkthrough, clearly distinguish sample mode from a verified connected session. Do not depend on a fresh login or AI request during the timed pitch.
