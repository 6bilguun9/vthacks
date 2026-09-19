# Frontend workspace

Owned by the two frontend teammates. Next.js App Router, React, TypeScript, Tailwind, and a minimal shadcn/ui-compatible Button/Card foundation are installed. `components.json` is ready for adding more shadcn components from this directory.

## Run

Use Node 24, then run inside `frontend/`:

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The default API origin is `http://localhost:3001`. To change it, copy `.env.example` to `.env.local`, edit `NEXT_PUBLIC_API_BASE_URL`, and restart Next.js. This variable is public and is embedded at build time for production.

The landing page contains the live dining-planner form and calendar. `/demo` renders an explicitly labeled synthetic plan without an API call. Live plans require the backend and its ARC credential.

## Layout

- `src/app/`: pages, global styles, and layout. Coordinate edits to shared files with the other frontend developer.
- `src/components/ui/`: reusable visual primitives.
- `src/features/`: feature-specific UI; overview, goals, and chat can be added independently.
- `src/lib/api.ts`: all browser-to-backend requests; validates the health response with Zod and uses a five-second timeout.
- `tests/`: API-client error handling and shared-contract checks.

The backend is a separate Fastify application. Do not put financial business logic, provider calls, or secret keys into Next.js route handlers. Future Supabase guest authentication will provide a bearer token that the backend verifies.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Independent production build |
| `npm start` | Serve the production build on port 3000 |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next route types, then TypeScript checks |
| `npm test` | API client and contract tests |
| `npm run check` | All checks and build |

Run shadcn commands from this folder so only the frontend manifest and lockfile change. ESLint 9 and TypeScript 5.9 are deliberately pinned to match the installed Next.js lint plugins' peer ranges. Coordinate toolchain upgrades rather than overriding peers.

## Working with mocks

Read `../contracts/README.md`. Copy only the synthetic examples needed for your feature into a local frontend mock module; label the screen as sample data. Do not import sibling directories into the runtime build, call planned endpoints as if they work, or silently replace failed live data with sample balances.

## Deployment

Use a separate Vercel project with root directory `frontend`, framework Next.js, and Node 24. Set the public backend URL before building. Backend provider credentials do not belong here. See `../docs/deployment.md`.
