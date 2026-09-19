# Financial engine boundary

Implement pure TypeScript calculations here. No HTTP calls, database access, model calls, or global clock reads. Pass the snapshot, plan, scenario, and as-of date explicitly.

Follow `docs/architecture.md` and the shared contracts. Amounts are integer cents. Goals reserve bank cash; they do not add assets. Model dated payments and income, preserve the cash buffer, and never treat restricted campus balances as general cash.

`goal-projection.ts` contains the first pure calculation primitive:

- Project a goal from its reserved allocation and confirmed weekly contribution dates.
- Calculate the weekly amount required by an optional target date.
- Stop at the two-year horizon instead of inventing a completion date.
- Compare a hypothetical purchase only against explicit discretionary, unallocated, and goal funding choices. An uncovered purchase returns `needs_information`; it never silently drains a goal.

It intentionally does not decide whether an unallocated balance is safe to spend. The future plan-level cash-flow simulator must check income timing, essential payments, other goal reservations, and the cash buffer before it supplies those funding values.

`cash-flow.ts` is that plan-level timing primitive:

- It accepts only plan-eligible bank cash; callers must exclude restricted campus balances and goal reservations before supplying the opening balance.
- It applies known income and essential expenses on their real scheduled dates through an explicit, inclusive horizon.
- It marks the plan as `buffer_breached` at the opening snapshot or first event that would leave less than the configured buffer. A later paycheck does not erase that timing problem.
- When flows share a calendar date, it applies income before essential expenses and returns `sameDayOrdering` so the interface can disclose the assumption.
- Monthly schedules remain anchored to their original day (for example, January 31 → February 28 → March 31). No model call, current-time read, or account mutation occurs here.
