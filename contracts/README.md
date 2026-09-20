# Shared API agreement

This directory is the coordination boundary between the independent frontend and backend apps. It is **not** an npm package or shared runtime library.

- `openapi.json`: OpenAPI 3.1 paths, authentication expectations, and implementation status.
- `schemas.json`: JSON Schema 2020-12 request/response definitions.
- `examples/`: explicitly synthetic fixtures, indexed by `manifest.json` and validated in both apps' test suites.

## What works now

`GET /api/v1/health` is live. It requires no authentication and returns:

```json
{ "status": "ok", "service": "student-finance-api", "apiVersion": "v1" }
```

It checks backend liveness, not provider readiness. `POST /api/v1/dining-plans` is also live: it validates a dining request, calls VT ARC only when an ARC key is configured, validates the response, and otherwise returns a safe unavailable/provider error. The remaining documented endpoints have `x-implementation-status: planned` and return 404. Guest sessions, authorization, persistence, and the public financial-planning API are not implemented yet.

## Planned interface

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/overview` | Authorized snapshot, plan, and projection |
| POST | `/api/v1/data/refresh` | Refresh synthetic Nessie data |
| POST | `/api/v1/plan/preview` | Preview edits to goals and plan inputs |
| POST | `/api/v1/scenarios` | Hypothetical purchase or extra contribution |
| POST | `/api/v1/chat` | Clarification, explanation, or comparison |
| POST | `/api/v1/plan/commit` | Explicit, versioned save |

Create/edit goals through a proposed plan, then commit only on explicit user action. This avoids two competing mutation APIs for the same plan. The commit body carries an idempotency key. The backend must load authorized source values and recalculate; browser totals are never authoritative. `scenarioId` is a correlation ID, not proof of authorization or a persisted preview.

Money is integer USD cents. Dates use `YYYY-MM-DD` in America/New_York; freshness timestamps include an offset. Unknown dates/amounts are `null`, not zero or made-up values. Negative `delayDays` means an earlier goal date.

## Working before the API is ready

Frontend developers may copy fixture data into an explicitly labeled local mock inside `frontend/`. Do not import this directory at runtime or serve fixtures as live banking results. The health check always uses the real API.

The overview example deliberately lacks income/expense schedules and reports `needs_information`. The two scenario examples are independent illustrative cases with their own assumptions and snapshot IDs; they are not derived from that overview. Fixed example dates do not represent current financial data.

## Changing a contract

1. Agree on a small interface change with the other team before coding consumers.
2. Update schemas, OpenAPI, examples, and affected frontend/backend code together.
3. Prefer additive changes and preserve existing fields while work is in flight.
4. Run `npm run check` in both apps. Tests validate references, example shapes, and the live health boundary.
5. Set an endpoint to `implemented` only when authorization and its actual behavior exist.

These are initial contracts, not a completed financial specification. Cross-field money conservation, source reconciliation, ownership, and cash-flow feasibility belong in backend logic and tests.
