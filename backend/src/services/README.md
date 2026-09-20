# Application services

Future services coordinate authorization, snapshots, provider adapters, financial calculations, and persistence. HTTP handlers should delegate here rather than contain financial logic.

Guest plan access must be authorized on the server. Plan commits must check the expected version and snapshot, recalculate changes, enforce idempotency, and save a revision atomically. Preview operations must not mutate saved plans.

`financial-snapshot.ts` is the first pure service boundary: it assembles validated Nessie accounts, manual campus balances, and manual university charges into a contract-shaped snapshot without merging their balances. It requires explicit source freshness timestamps; it does not fetch providers, choose a clock, persist data, or grant authorization.

`eligible-bank-cash.ts` requires an explicit checking/savings selection before producing a plan-eligible cash total. It rejects credit accounts, never includes campus balances, preserves known overdrafts, and returns `needs_information` when the selection is missing or unsafe.

`plan-preview.ts` composes a frozen snapshot, explicit account selection, and a proposed plan into a pure preview. It does not persist, mutate, fetch, or authorize anything; a future authorized HTTP handler can call it after loading the user's snapshot and plan.

`purchase-scenario.ts` compares an explicit hypothetical funding decision with that preview. Budgeted discretionary spending does not create a duplicate cash outflow; unallocated and goal-funded amounts do. It returns before/after projections, goal-date impact, a buffer shortfall when applicable, or a focused `needs_information` result without saving anything.

`source-freshness.ts` evaluates a source with an explicit evaluation timestamp and maximum age. It preserves upstream stale flags, uses `fetchedAt` for provider data or `asOf` for manual data, and reports future timestamps as unknown rather than fresh.
