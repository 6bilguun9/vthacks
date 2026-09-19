# Financial engine boundary

Implement pure TypeScript calculations here. No HTTP calls, database access, model calls, or global clock reads. Pass the snapshot, plan, scenario, and as-of date explicitly.

Follow `docs/architecture.md` and the shared contracts. Amounts are integer cents. Goals reserve bank cash; they do not add assets. Model dated payments and income, preserve the cash buffer, and never treat restricted campus balances as general cash.

This starter contains no calculation implementation. The two backend developers will divide ownership later.
