# Backend workspace

Owned by the two backend teammates. Fastify, TypeScript, Zod, and Vitest are installed. The individual backend task split will be planned later.

## Run

Use Node 24, then run inside `backend/`:

```sh
npm ci
npm run dev
```

Default address: <http://localhost:3001/api/v1/health>. No API keys, Supabase project, or `.env` file are needed for the starter.

For overrides, copy `.env.example` to `.env`. Node loads it using `--env-file-if-exists`. Set `PORT`, `HOST`, and `CORS_ORIGINS` as needed. Origins are comma-separated exact HTTP(S) origins, with no trailing slash, path, credentials, or wildcard. The default is `http://localhost:3000`.

## Implemented boundary

- `GET /api/v1/health` reports backend liveness only, with `Cache-Control: no-store`.
- Configured frontend origins receive CORS access, including future bearer-auth preflights.
- Other origins receive no CORS permission. CORS is a browser restriction, **not authentication**.
- Unimplemented routes return a structured 404, not fabricated financial data.
- Request bodies are limited to 64 KiB. Internal errors and raw query strings are not exposed in responses/logs.

The health route and ARC-backed `POST /api/v1/dining-plans` route are registered. Dining responses are schema-validated before release. Authentication, rate limits, database access, and the remaining financial/agent endpoints still need implementation before a public release.

`src/integrations/nessie.ts` is a tested, read-only sandbox adapter. It is not wired to a public route yet: add `NESSIE_API_KEY` only to ignored backend configuration, use its customer-account and account-purchase reads through an authorized service, then normalize records into immutable snapshots. It converts provider dollars to exact integer cents and rejects unknown/invalid shapes rather than treating them as spendable data.

## Internal planning pipeline

The following backend modules are implemented and tested, but intentionally are **not** public routes until guest authorization, snapshot persistence, and version checks exist:

```text
Nessie read-only adapter + manual entries
        -> financial snapshot (bank / campus / charges remain separate)
        -> explicit checking/savings account selection
        -> deterministic plan preview (goals + dated cash flows + buffer)
        -> hypothetical purchase scenario (before / after / goal impact)
```

- `src/finance/goal-projection.ts` projects goal dates and required weekly savings in integer cents.
- `src/finance/cash-flow.ts` simulates dated income, essential expenses, goal contributions, and temporary scenario purchases while protecting the buffer.
- `src/finance/plan-projection.ts` reserves existing goal allocations once and composes the plan-level simulation.
- `src/services/financial-snapshot.ts`, `eligible-bank-cash.ts`, `plan-preview.ts`, and `purchase-scenario.ts` are pure orchestration layers. They neither read global time nor mutate accounts or plans.

Use these modules from a future authorized `POST /api/v1/plan/preview` or `/api/v1/scenarios` service. Do not make the browser authoritative for balances, selected accounts, or results; load the persisted snapshot/plan server-side and return the calculated output.

## Layout

| Location | Responsibility |
| --- | --- |
| `src/index.ts` | Listening server and shutdown handling; Vercel entrypoint |
| `src/create-app.ts` | App factory, CORS, and error boundaries; import this in tests |
| `src/routes/` | Thin HTTP handlers |
| `src/config/` | Environment validation |
| `src/services/` | Snapshot normalization, explicit cash selection, and pure plan/scenario previews; future authorized workflows |
| `src/finance/` | Pure deterministic goal, cash-flow, and plan calculations |
| `src/integrations/` | Server-only Nessie, ARC, and ANS adapters |
| `src/agents/` | Future coach/planner endpoints |
| `supabase/migrations/` | Future database migrations |

There is no database provisioning or provider traffic on startup. Blank integration variables are placeholders, not a claim that integrations exist.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch TypeScript source with Node/tsx |
| `npm run build` | Compile source to `dist/` |
| `npm start` | Run the compiled server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Source/config/test TypeScript checks |
| `npm test` | HTTP, CORS, configuration, and contract tests |
| `npm run check` | All checks and build |

Add dependencies here only. Coordinate any shared API shape changes through `../contracts/`. Preserve the financial invariants in `../docs/architecture.md`.

## Deployment

Use a separate Vercel project rooted at `backend`, framework Fastify, and Node 24. `src/index.ts` uses the documented listening-server entrypoint. Set `HOST=0.0.0.0` and explicitly allow the deployed frontend origin. Runtime builds do not depend on sibling files. See `../docs/deployment.md` for the integration milestones; this starter has not been deployed.
