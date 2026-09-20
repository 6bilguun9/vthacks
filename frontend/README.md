# Frontend workspace

Owned by the two frontend teammates. Next.js App Router, React, TypeScript, Tailwind, and a minimal shadcn/ui-compatible Button/Card foundation are installed. `components.json` is ready for adding more shadcn components from this directory.

## Run

Use Node 24, then run inside `frontend/`:

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The default API origin is `http://localhost:3001`. To change it, copy `.env.example` to `.env.local`, edit `NEXT_PUBLIC_API_BASE_URL`, and restart Next.js. This variable is public and is embedded at build time for production.

The landing page integrates the Hokie Wallet dashboard and Neha’s ChatPanel. Balances, spending, savings illustrations, and chat replies are explicitly synthetic, fixed September 2026 examples; they do not establish affordability or connect to accounts or AI. The separate live health check still makes a real request, shows connected/unavailable states, and lets you retry. Backend availability never switches the dashboard’s data source.

Sample data lives in `src/features/dashboard/demo-data.ts`, shared by the dashboard and chat. Monetary fields use integer USD cents and are converted to dollars only for display. Campus restricted funds remain separate from bank cash; savings allocations are included in bank cash. Financial summaries and contribution illustrations are fixed mocks pending backend calculations. The imported UI uses existing dependencies, so package versions and configuration are unchanged.

The live dining planner is available at `/dining`; `/demo` renders an explicitly labeled synthetic dining calendar without an API call. Live dining plans require the backend and its server-only ARC credential.

The shared header includes a notification bell. Savings and workspace examples are labeled **Sample**; appearance/accessibility changes create real local system notices. Read status persists in this browser. `publishNotification` in `src/features/notifications/use-notifications.ts` is the future integration point: call it only after a confirmed change, use a stable event ID to avoid duplicates, and supply backend-provided goal values rather than calculating them in the browser. Notifications currently have no API connection or operating-system push permission.

Typography uses locally bundled Lato, with Comic Relief reserved for the HokieBird speech bubble. Font licenses are in `src/app/fonts/`; campus photo sources are documented in `public/campus/README.md`.

## Presentation

Run `npm run presentation:export` inside `frontend/` to create `presentation-dist/Hokie_Wallet_Presentation.html`. Open or share that single file directly; its images and fonts are embedded, so it does not need a running website or backend. External source and app links still need their destinations to be available.

The development route remains at <http://localhost:3000/present>. Both versions contain the current 504-word script in nine scenes across 240 seconds: Carlos presents 0:00–1:00, Neha 1:00–2:00, Grant 2:00–3:00, and Bilguun 3:00–4:00. The PowerPoint in `../docs/presentation/` is an older fallback with an earlier script.

Use the arrow keys for previous/next scenes, Space for the next scene, P to play/pause the automatic four-minute timeline, N for presenter notes, F for fullscreen, H to hide/show controls, and Home/End for the first/last scene. Notes are hidden in the default audience view, contain source links, and pause playback when opened. Close them before sharing the presentation screen. The reduced-motion toggle follows the system preference until the presenter overrides it.

Screenshots show the actual UI with sample data. Backend flows explain Nessie sandbox/manual inputs, Supabase persistence, and the signed ANS Coach-to-Planner path without making live requests. A separate synthetic contract comparison replays a $150 purchase: $50 discretionary plus $100 from the selected Laptop goal, with its projected date moving from November 16 to November 23, 2026. Those values do not belong to the dashboard profile. FinBot replies remain scripted; frontend authentication and hosted provider verification are still pending. Asset credits are in `public/presentation/README.md`. See `../docs/presentation/README.md` for the speaker schedule, sponsor context, and rehearsal details.

## Layout

- `src/app/`: pages, global styles, and layout. Coordinate edits to shared files with the other frontend developer.
- `src/components/ui/`: reusable visual primitives.
- `src/features/`: feature-specific UI, including the dashboard, shared demo data, scripted chat, and live system status.
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
| `npm run presentation:export` | Export the current slideshow as one portable HTML file with embedded images and fonts |

Run shadcn commands from this folder so only the frontend manifest and lockfile change. ESLint 9 and TypeScript 5.9 are deliberately pinned to match the installed Next.js lint plugins' peer ranges. Coordinate toolchain upgrades rather than overriding peers.

## Working with mocks

Read `../contracts/README.md`. Copy only the synthetic examples needed for your feature into a local frontend mock module; label the screen as sample data. Do not import sibling directories into the runtime build, call planned endpoints as if they work, or silently replace failed live data with sample balances.

## Deployment

Use a separate Vercel project with root directory `frontend`, framework Next.js, and Node 24. Set the public backend URL before building. Backend provider credentials do not belong here. See `../docs/deployment.md`.
