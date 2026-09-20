# Backend workspace

Owned by the two backend teammates. Uses Fastify, TypeScript, Zod, Vitest, and Supabase. See [the integration handoff](../docs/backend-handoff.md) for the teammate split and frontend connection sequence.

## Run

Use Node 24, then run inside `backend/`:

```sh
npm ci
npm run dev
```

Default address: <http://localhost:3001/api/v1/health>. Startup and health do not need credentials. Private endpoints require Supabase configuration, the migration, and a valid guest access token.

For overrides, copy `.env.example` to `.env`. Node loads it using `--env-file-if-exists`. Set `PORT`, `HOST`, and `CORS_ORIGINS` as needed. Origins are comma-separated exact HTTP(S) origins, with no trailing slash, path, credentials, or wildcard. The default is `http://localhost:3000`.

## Implemented boundary

- `GET /api/v1/health` reports backend liveness only, with `Cache-Control: no-store`.
- Configured frontend origins receive CORS access, including future bearer-auth preflights.
- Other origins receive no CORS permission. CORS is a browser restriction, **not authentication**.
- Unimplemented routes return a structured 404, not fabricated financial data.
- Request bodies are limited to 64 KiB. Internal errors and raw query strings are not exposed in responses/logs.

Financial routes verify Supabase bearer tokens and load owner-scoped state. Bootstrap explicitly selects fixture data. Preview/scenarios/chat are non-mutating; commits use snapshot/version checks and an idempotency key. Database-backed limits protect writes and AI calls. AI endpoints default off and require presenter allowlisting when enabled. No public unrestricted AI-provider proxy is provided.

`POST /api/v1/data/refresh` uses the read-only Nessie adapter for the server-configured sandbox customer. Add `NESSIE_API_KEY` and `NESSIE_CUSTOMER_ID` only to backend configuration. The adapter converts provider dollars to exact integer cents and validates records before creating immutable snapshots. Provider errors preserve the prior snapshot; they never silently substitute fixtures.

## Planning pipeline

Authorized application services connect persisted inputs to pure calculation modules:

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

`src/services/planning.ts` composes the public projection/scenario engine, including dated goal reservations, weekly discretionary budgets, tuition funding, and recovery alternatives. `src/application/finance-api.ts` orchestrates preview, commit, refresh, and reconciliation. The browser is never authoritative for balances or calculated totals.

## Layout

| Location | Responsibility |
| --- | --- |
| `src/index.ts` | Listening server and shutdown handling for local/container runs |
| `api/function.ts` | Vercel Function adapter that forwards requests into Fastify |
| `src/create-app.ts` | App factory, CORS, and error boundaries; import this in tests |
| `src/routes/` | Thin HTTP handlers |
| `src/config/` | Environment validation |
| `src/services/` | Snapshot normalization, cash selection, and pure plan/scenario calculations |
| `src/application/` | Authorized financial workflows and explicit fixture bootstrap |
| `src/domain/` | Validated domain schemas and dependency interfaces |
| `src/auth/`, `src/persistence/`, `src/limits/` | Token verification, owner-scoped storage, database limits |
| `src/finance/` | Pure deterministic goal, cash-flow, and plan calculations |
| `src/integrations/` | Server-only Nessie, AI-provider, and ANS adapters |
| `src/agents/` | Constrained intent parsing, grounded explanations, dining validation |
| `supabase/migrations/` | Executable schema, RLS, atomic mutation and limit functions |
| `supabase/tests/` | Isolated PostgreSQL integration/concurrency checks |

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
| `npm run test:db` | PostgreSQL RLS, atomic saves, idempotency, and limits; requires Docker |
| `npm run contracts:sync` | Regenerate coordinated JSON schemas and API examples |
| `npm run nessie:status` | Read-only sandbox customer-ID discovery; no credentials printed |

Add dependencies here only. Coordinate any shared API shape changes through `../contracts/`. Preserve the financial invariants in `../docs/architecture.md`.

## Deployment

Use a separate Vercel project rooted at `backend` and Node 24. The checked-in `vercel.json` selects the framework-neutral Node Function build, disables the static build command, and rewrites `/api/v1/*` to `api/function.ts`. `src/index.ts` remains the local/container listening entrypoint; Vercel does not need `HOST` or `PORT`. Explicitly allow the deployed frontend origin with `CORS_ORIGINS`. Apply the migration and configure anonymous auth/CAPTCHA before connecting the frontend. See [deployment](../docs/deployment.md) and [handoff](../docs/backend-handoff.md); hosted integration remains a separate verification step.
