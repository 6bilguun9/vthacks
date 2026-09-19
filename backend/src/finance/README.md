# Financial engine boundary

Implement pure TypeScript calculations here. No HTTP calls, database access, model calls, or global clock reads. Pass the snapshot, plan, scenario, and as-of date explicitly.

Follow `docs/architecture.md` and the shared contracts. Amounts are integer cents. Goals reserve bank cash; they do not add assets. Model dated payments and income, preserve the cash buffer, and never treat restricted campus balances as general cash.

`goal-projection.ts` contains the first pure calculation primitive:

- Project a goal from its reserved allocation and confirmed weekly contribution dates.
- Calculate the weekly amount required by an optional target date.
- Stop at the two-year horizon instead of inventing a completion date.
- Compare a hypothetical purchase only against explicit discretionary, unallocated, and goal funding choices. An uncovered purchase returns `needs_information`; it never silently drains a goal.

It intentionally does not decide whether an unallocated balance is safe to spend. The future plan-level cash-flow simulator must check income timing, essential payments, other goal reservations, and the cash buffer before it supplies those funding values.
