# Application services

Future services coordinate authorization, snapshots, provider adapters, financial calculations, and persistence. HTTP handlers should delegate here rather than contain financial logic.

Guest plan access must be authorized on the server. Plan commits must check the expected version and snapshot, recalculate changes, enforce idempotency, and save a revision atomically. Preview operations must not mutate saved plans.

`financial-snapshot.ts` is the first pure service boundary: it assembles validated Nessie accounts, manual campus balances, and manual university charges into a contract-shaped snapshot without merging their balances. It requires explicit source freshness timestamps; it does not fetch providers, choose a clock, persist data, or grant authorization.
