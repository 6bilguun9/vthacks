# VT Student Savings Planner

A hackathon starter for an AI-assisted financial planner for Virginia Tech students. The product will combine Nessie **sandbox** banking data, manually entered campus balances and charges, deterministic savings calculations, and a VT ARC-powered conversation interface.

## Current status

**Implemented:** independent frontend and backend applications, a live API connectivity check, API specifications and synthetic fixtures, CI, and collaboration documentation.

**Not implemented yet:** financial calculations, goal persistence, guest authentication, banking connections, AI chat, or an active ANS registration. The backend now includes safe ANS CLI tooling and scaffolded coach/planner endpoints, but it does not contact GoDaddy or claim an agent is available unless a backend maintainer deliberately runs the documented commands with a domain and complete ANS `KEY:SECRET` credential pair. The health endpoint verifies only that the backend is running. It does not verify external integrations.

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

Open <http://localhost:3000>. The frontend checks <http://localhost:3001/api/v1/health>. Neither app needs credentials for this starter. Optional environment templates are in each app's `.env.example`; setup details are in the app READMEs.

## Work boundaries

| Location | Owners | Contents |
| --- | --- | --- |
| `frontend/` | Two frontend teammates | UI, browser API client, frontend dependencies and tests |
| `backend/` | Two backend teammates | HTTP API, calculations, integrations, agents, database work |
| `contracts/` | Both teams coordinate changes | API specification, JSON schemas, synthetic examples |
| `docs/`, root config, `.github/` | Coordinate before editing | Architecture, workflow, deployment instructions, CI |

Each app owns its own `package.json` and `package-lock.json`. Neither application imports the other's source or shared runtime code. The later division of work between the two backend developers is intentionally not assigned here.

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
