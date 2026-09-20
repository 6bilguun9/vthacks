# Product architecture and MVP decisions

## Goal and delivery boundary

Help Virginia Tech students understand what they can afford and how purchases affect savings goals. Target an under-24-hour hackathon with two frontend developers and two backend developers.

The backend implements the planning workflows below. Hosted Supabase/provider configuration and frontend integration are still activation gates; source implementation does not establish a live integration. See [the handoff](backend-handoff.md) for exact request sequencing and the backend teammate split.

## Applications

```text
Browser / Next.js frontend
        | versioned HTTP JSON + guest bearer token
Fastify backend
        |-- authorized services --> Supabase
        |-- read-only banking adapter --> Nessie sandbox
        |-- coach --> VT ARC (parse/explain)
        |           --> ANS (resolve planner)
        |           --> authenticated planner endpoint
        |-- planner --> deterministic TypeScript finance engine
```

The app directories are independent npm projects and deployment roots. Communication uses the API contract, not cross-directory imports. The coach and planner share backend infrastructure but have separate registered agent identities. All financial calculations live in the backend.

Frontend stack: Next.js, React, TypeScript, Tailwind, shadcn/ui, and Zod. Backend stack: Node 24, Fastify, TypeScript, Zod, and Supabase. Add charts/forms libraries when the corresponding feature needs them. No vector database, autonomous agent framework, or separate Python service is required.

## User experience

1. Start a private anonymous guest session and load a labeled sample financial profile.
2. Confirm income schedules, essential expenses, university charges, discretionary allowance, and a minimum buffer.
3. Create multiple goals with target amount, existing allocation, optional deadline, and explicit weekly contributions.
4. Show overview, confirmed progress, projected savings, and a conversational planning interface.
5. Compare a hypothetical purchase or contribution change with the saved plan.
6. Save only after the user explicitly chooses a revision. Refreshing the browser should preserve that guest's plan.

Guest persistence is same-browser access; clearing the session can lose access. Email signup, recovery, cross-device access, real bank login, VT SSO, OCR/imports, notifications, payments, and automatic goal prioritization are outside this MVP.

## Financial invariants

- Use safe integer USD cents. Use calendar dates in America/New_York. Clamp monthly recurrence to the last valid day where necessary; do not equate a month with four weeks.
- Treat bank cash, campus restricted balances, and university charges separately. Credit limits and restricted funds are not general spending capacity.
- Goal allocations are reservations within eligible bank cash, not additional assets. Combined allocations cannot reserve the same money twice.
- Start projections from the current balance snapshot. Do not replay historical transactions against that current balance.
- Deduplicate provider records by source, type, and ID. Internal transfers between included accounts are neither income nor spending. Resolve provider status/balance semantics explicitly before relying on pending records.
- Confirm future income and expenses. Unknown input stays unknown; missing critical dates or amounts produce focused questions or `needs_information`.
- Use dated cash flows. A monthly surplus does not establish affordability when a bill is due before payday. Date-granularity projections must disclose any same-day ordering assumption.
- Essential payments and the cash buffer are protected. Keep other goals' contributions fixed when examining a goal change. Report infeasibility rather than silently reallocating contributions.
- A goal without a deadline can use a suggested affordable weekly contribution that the user confirms. A goal with a deadline needs the ceiling-in-cents of its remaining amount divided by actual contribution dates, followed by a feasibility simulation.
- Use a two-year horizon. Report that a goal was not reached within the horizon instead of inventing a completion date. No assumed interest, investment returns, or inflation.
- Forecast savings are not confirmed progress. Time passing does not authorize a change to confirmed allocations.
- Link a tuition goal to the charge it funds. Reserving for tuition and paying tuition are not two separate expenses.

## Purchase comparisons

Check discretionary allowance, cash timing, unallocated cash, essentials, and the buffer. If a purchase fits the existing discretionary forecast, replace that part of the forecast instead of adding the purchase again. This can leave the goal schedule unchanged.

If a shortfall must come from a goal, ask which goal the user wants to explore affecting. Return original date, revised date, estimated delay, and catch-up alternatives. Distinguish an already-infeasible baseline from a purchase causing a new problem.

An extra weekly contribution must come from available funds or an explicitly modeled income/spending change. Recovery amounts are requirements, not proof that the user can afford them. Simulate their funding before presenting them as achievable.

Reference acceptance case: a $1,000 goal with $200 allocated and eight affordable weekly $100 contributions. A $150 purchase within a $200 discretionary allowance leaves the date unchanged. With only $50 discretionary and no free cash, selecting that goal for $100 creates a ninth contribution. Recovering the original schedule requires $100 next week or $12.50 across the original eight dates, subject to affordability.

## Persistence and saving

Expected tables: profiles, immutable financial snapshots, current plans, plan revisions, and operational limits. Use owner-based row-level security for all private guest data. The backend verifies the user token; browser IDs and amounts do not establish authorization.

Preview operations do not modify the saved plan. Commit operations load authorized source data, recalculate, check the expected version and snapshot ID, enforce idempotency, and save a revision atomically. Return 409 for stale comparisons. Reusing an idempotency key with a different payload is also a conflict.

A saved hypothetical purchase is a planned expense, not a completed bank transaction. On refresh, match it to a real transaction or ask the user to reconcile/cancel it; never deduct both records. Past-due planned expenses remain unresolved rather than silently disappearing.

## Data and AI boundaries

Nessie provides synthetic banking data. Support authorized manual entry of university charges, due dates, and restricted balances; do not claim a Hokie Wallet API connection. Include per-source timestamps and clear sample/manual/stale labels.

VT ARC interprets a constrained set of intents and explains engine results. Validate model output with Zod, allow one bounded repair, and use a scenario form if parsing fails. Render numerical results from the engine. Validate explanation references/placeholders and fall back to deterministic text if grounding fails.

Send only required financial fields to ARC; omit personal identifiers and raw transaction details. Cap requests and disable external provider fallback by default. ARC availability and app-mediated public use must be verified before unrestricted public AI access.

ANS registration/discovery is real integration work, not a badge. The coach resolves the planner's configured host/version, validates the destination, and authenticates the request. Sign the audience, body, timestamp, and nonce; reject expiry/replay. Never allow user/model-chosen URLs. An outage may use the local engine only if the UI clearly labels the fallback.

## Public-release requirements to verify in the hosted environment

- Anonymous guest sessions, RLS isolation, and server authorization on every private endpoint.
- Turnstile at guest creation; Postgres-backed rate counters and expiring concurrency leases.
- Initial chat limits: five requests/minute/guest, a separate IP limit, one in-flight chat/guest, and two simultaneous ARC calls globally.
- Provider timeouts, bounded retries, safe errors, data freshness, and an AI kill switch.
- No provider credentials or raw financial payloads in the browser or logs.
- Clearly identify sample-data affordability as a hypothetical result, not the visitor's actual bank position.

## Feature acceptance checklist

- A budgeted purchase does not delay a goal; an explicitly goal-funded purchase can.
- Bills before payday, combined goal allocations, missing inputs, zero contributions, reached goals, past deadlines, cent rounding, and restricted funds behave explicitly.
- Transfers, duplicate records, tuition funding, and reconciled planned purchases are counted once.
- Preview/discard does not mutate; save is atomic and retry-safe; a stale preview is rejected.
- A second guest cannot access the first guest's plan; browser refresh retains the current guest plan.
- Provider failures are labeled; one real ANS resolution and authenticated planner call succeeds for the sponsor demo.

## Sources verified during planning

- [Nessie sandbox overview](https://api.nessieisreal.com/) and [official SDK resource shapes](https://github.com/nessieisreal/nessie-javascript-sdk)
- [Virginia Tech account restrictions](https://www.hokiepassport.vt.edu/pages/FAQ.php?div2=Student)
- [VT ARC API, models, access, and retention](https://www.docs.arc.vt.edu/ai/011_llm_api_arc_vt_edu.html)
- [GoDaddy ANS registration](https://developer.godaddy.com/en/docs/references/rest/ans/registration) and [resolution](https://developer.godaddy.com/en/docs/references/rest/ans/resolution)
- [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
