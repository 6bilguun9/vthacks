# VT Student Savings Planner

An AI-assisted financial planner for Virginia Tech students, with Nessie **sandbox** banking data, manually entered campus balances and charges, deterministic savings calculations, and a server-selected VT ARC or OpenRouter conversation interface.

## Current status

**Implemented in the backend:** authorized guest-owned plans, Supabase persistence/RLS migrations, deterministic previews and purchase comparisons, explicit versioned saves, read-only Nessie refresh, manual campus data, presenter-restricted AI chat/dining, signed ANS planner calls, persistent limits, and automated tests. The frontend and backend remain independent applications.

**Implemented in the frontend:** explicit verified guest connection, server-backed account/goal views, planning previews and confirmed saves, manual campus inputs, planned-purchase reconciliation, authenticated presenter chat/dining, and a separate labeled demo mode.

**Still required before public use:** configure the public frontend Supabase/Turnstile settings, select/provision a populated Nessie sandbox customer, and run the hosted two-guest isolation and end-to-end save tests. Provider-mocked tests and local PostgreSQL tests do not prove hosted integration readiness. The health endpoint verifies only that the backend is running. See the [backend handoff](docs/backend-handoff.md) for the activation checklist and teammate split.

## Start here

Use Node.js **24** (see `.nvmrc`). With nvm installed, run `nvm install` and `nvm use` from this directory. There is no root npm package: install dependencies separately in each app.

Backend terminal:

```sh
cd backend
npm ci
npm run dev
```

Frontend terminal, starting from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open <http://localhost:3000>. The frontend checks <http://localhost:3001/api/v1/health>. Startup and health need no credentials; private financial endpoints require configured Supabase authentication/storage. Environment templates are in each app's `.env.example`; setup details are in the app READMEs.

## Work boundaries

| Location | Owners | Contents |
| --- | --- | --- |
| `frontend/` | Two frontend teammates | UI, browser API client, frontend dependencies and tests |
| `backend/` | Two backend teammates | HTTP API, calculations, integrations, agents, database work |
| `contracts/` | Both teams coordinate changes | API specification, JSON schemas, synthetic examples |
| `docs/`, root config, `.github/` | Coordinate before editing | Architecture, workflow, deployment instructions, CI |

Each app owns its own `package.json` and `package-lock.json`. Neither application imports the other's source or shared runtime code. The [backend handoff](docs/backend-handoff.md#backend-teammate-split) divides the remaining backend integration work between the two developers.

## Team workflow

Use a separate feature branch **per person/feature**, then a pull request into `main`. Do not share one long-lived `frontend` or `backend` branch. Read [the collaboration guide](docs/contributing.md) before your first change.

## Checks

Run inside either app:

```sh
npm run check
```

This runs lint, type checks, tests, and a production build. Contract tests use the sibling `contracts/` directory from the full clone, but runtime builds and deployments are independent. Both CI workflows run when contracts change.

## Documentation

- [Frontend setup](frontend/README.md)
- [Backend setup](backend/README.md)
- [API contracts and examples](contracts/README.md)
- [Product architecture and financial rules](docs/architecture.md)
- [Git and collaboration guide](docs/contributing.md)
- [Deployment and integration setup](docs/deployment.md)

The MVP is read-only with respect to financial accounts. Never commit provider credentials, real student records, or account exports. Campus balances, bank cash, and university charges must stay distinct.
