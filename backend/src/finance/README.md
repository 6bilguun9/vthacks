# Financial engine boundary

Implement pure TypeScript calculations here. No HTTP calls, database access, model calls, or global clock reads. Pass the snapshot, plan, scenario, and as-of date explicitly.

Follow `docs/architecture.md` and the shared contracts. Amounts are integer cents. Goals reserve bank cash; they do not add assets. Model dated payments and income, preserve the cash buffer, and never treat restricted campus balances as general cash.

`goal-projection.ts` contains the first pure calculation primitive:

- Project a goal from its reserved allocation and confirmed weekly contribution dates.
- Calculate the weekly amount required by an optional target date.
- Stop at the two-year horizon instead of inventing a completion date.
- Compare a hypothetical purchase only against explicit discretionary, unallocated, and goal funding choices. An uncovered purchase returns `needs_information`; it never silently drains a goal.

It intentionally does not decide whether an unallocated balance is safe to spend. `plan-projection.ts` combines it with income timing, essential payments, other goal reservations, and the cash buffer before a caller can present an affordability result.

`cash-flow.ts` is that plan-level timing primitive:

- It accepts only plan-eligible bank cash; callers must exclude restricted campus balances and goal reservations before supplying the opening balance.
- It applies known income, essential expenses, and fixed future goal contributions on their real scheduled dates through an explicit, inclusive horizon.
- It marks the plan as `buffer_breached` at the opening snapshot or first event that would leave less than the configured buffer. A later paycheck does not erase that timing problem.
- When flows share a calendar date, it applies income before outflows and returns `sameDayOrdering` so the interface can disclose the assumption.
- Monthly schedules remain anchored to their original day (for example, January 31 → February 28 → March 31). No model call, current-time read, or account mutation occurs here.

`plan-projection.ts` composes goals and cash flow without any runtime data access:

- Existing allocations are removed from the opening eligible cash once. Allocations that exceed that cash are an explicit infeasibility, not a second asset pool.
- Each remaining weekly goal contribution is represented as a dated outflow, with a smaller final contribution when needed.
- Missing eligible cash yields `needs_information`; it does not produce a discretionary amount or affordability verdict.
- The horizon is limited to 730 days and estimates stay explicitly labeled as estimates.
- A caller can supply explicitly labeled `additionalOutflows` for a non-persistent scenario. They are simulated as dated hypothetical purchases; they do not alter a plan or account data.
