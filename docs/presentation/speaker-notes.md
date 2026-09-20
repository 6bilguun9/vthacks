# Hokie Wallet: four-minute speaker script

Carlos: 0:00–1:00. Neha: 1:00–2:00. Grant: 2:00–3:00. Bilguun: 3:00–4:00.

The speaking text below is also embedded in the PowerPoint speaker notes. Timing targets total 4:00. Rehearse once with a timer to account for handoffs and speaking pace.

## Slide 1 — Carlos (0:00–0:15 · 15 seconds)

Hi, I’m Carlos. Together with Neha, Bilguun, and Grant, we built Hokie Wallet: a student budgeting prototype that helps Hokies plan everyday spending and make their dining money last.

## Slide 2 — Carlos (0:15–0:35 · 20 seconds)

Virginia Tech lets us check balances and transaction history, and offers budgeting resources. But a balance still leaves a practical question: what should I spend today? We want to connect dining choices with everyday spending and savings, so students can plan ahead.

## Slide 3 — Carlos (0:35–1:00 · 25 seconds)

Neha and I built the frontend around that decision. Overview brings bank cash, restricted campus funds, and monthly spending together. Activity helps explain spending patterns, while Savings shows progress toward a goal. We keep campus funds separate from cash so the numbers do not suggest money you can spend anywhere.

## Slide 4 — Neha (1:00–1:35 · 35 seconds)

I’m Neha. FinBot gives students a familiar place to ask about their money instead of interpreting every number themselves. I worked on the chat experience, including saved conversations, renaming chats, and a multiline message box. A student can return to a question as their plans change. The current demonstration uses scripted replies and sample balances. Bilguun will explain the backend coach and planner that are ready for the next integration step.

## Slide 5 — Neha (1:35–2:00 · 25 seconds)

We also wanted students to use this comfortably. They can adjust text size, choose clearer color palettes, reduce motion, or listen to the current view. Ten language options translate core interface labels. These controls stay available in dining, so students do not lose their preferences when they switch tasks.

## Slide 6 — Grant (2:00–2:40 · 40 seconds)

I’m Grant. Dining makes this useful for Hokies. Students enter their meal plan, balance, weeks left, and preferences or class schedule. Our dining backend asks VT ARC for a representative week of meals, prioritizing included swipes and exchanges before dining dollars. It checks the response and recalculates costs from the individual meals. It rejects estimates that exceed the supplied balance. Prices remain estimates, with current hours linked, so students can check before they go. The goal is to use the benefits they already paid for.

## Slide 7 — Grant (2:40–3:00 · 20 seconds)

Behind the screens, our API combines a saved financial plan with Nessie sandbox banking data and student-entered campus balances. Supabase stores each guest’s state. Those backend workflows are implemented. The dashboard’s authenticated connection is still in progress, which is why these screens show sample data.

## Slide 8 — Bilguun (3:00–3:40 · 40 seconds)

I’m Bilguun. Our coach and planner have different jobs. VT ARC turns a supported money question into a structured request. For a purchase comparison, the coach discovers our planner through GoDaddy ANS, then sends a signed, authenticated message. The planner uses deterministic calculations to compare cash flow and savings goals before and after that purchase. It returns the comparison, and the coach explains it in plain language. This helps students understand a trade-off before spending. Previewing a scenario never changes the saved plan.

## Slide 9 — Bilguun (3:40–4:00 · 20 seconds)

That connects our work to the challenges: Nessie supplies banking context, ANS enables agent discovery, and campus dining planning fits Deloitte and Databricks’ student-experience theme. Our goal is straightforward: help Hokies understand what they can afford today while protecting what they need tomorrow. Thank you.
