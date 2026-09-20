# Frontend workspace

Owned by the two frontend teammates. Next.js App Router, React, TypeScript, Tailwind, and a minimal shadcn/ui-compatible Button/Card foundation are installed. `components.json` is ready for adding more shadcn components from this directory.

## Run

Use Node 24, then run inside `frontend/`:

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. The default API origin is `http://localhost:3001`. To change it, copy `.env.example` to `.env.local`, edit `NEXT_PUBLIC_API_BASE_URL`, and restart Next.js. This variable is public and is embedded at build time for production.

The landing page keeps an explicitly labeled dashboard demo. Choose **Connect sandbox** to use a private Supabase guest session and the backend’s saved state. Demo and connected data never silently replace each other. All bank data is either a synthetic fixture or Capital One Nessie sandbox data, not a real student bank account.

For connected mode, copy `.env.example` to ignored `.env.local` and configure the public API origin, Supabase project URL/publishable key, and Turnstile site key. Enable anonymous sign-ins and CAPTCHA in the matching Supabase project; allow your frontend hostname in Turnstile and the backend’s CORS list. Restart development or rebuild production after changing public settings. Never use a Supabase secret/service-role key or any provider secret in the frontend.

Guest creation happens only after an explicit connection and verification. Existing guests resume through the Supabase SDK. If no saved state exists, **Create my sample plan** explicitly initializes synthetic data. A failed session refresh never silently creates a new guest. Keep the same browser session to retain access.

Connected views include account/source timestamps, restricted campus funds, bank purchases, goals, and backend projections. In Savings, confirm selected accounts, the current week’s remaining allowance, income, bills, and goal inputs; preview before saving. Purchase and contribution comparisons display server-calculated funding, goal dates, and missing-information warnings. Activity lets you explicitly match a planned purchase to an eligible transaction or cancel the planned entry. Campus balances and university charges can be entered separately in Overview. No action moves money or submits a bank transaction.

Versioned commits persist their exact request and idempotency key in this tab’s session storage before sending. An uncertain result pauses other plan edits and offers a retry of that same request. Storage failures stop writes. Manual campus updates and Nessie refreshes reload saved state after uncertain results rather than blindly retrying writes. Financial calculations remain entirely in the backend; the browser only converts dollar inputs to integer cents and formats returned values.

FinBot uses authenticated `/chat` in connected mode; history is separated by guest and demo mode. Its comparisons never save changes. Each question is stateless: include its amount/date/goal explicitly. `/dining` uses the authenticated dining endpoint; `/demo` stays a clearly labeled synthetic calendar. Both AI features require `capabilities.ai` from the backend, normally presenter access. The connection panel exposes a guest ID for the backend team to authorize; it never exposes access tokens. Signed ANS versus local fallback execution is labeled from the actual response.

The public backend health/CORS and browser configuration can be checked without sign-in. Hosted guest signup, two-guest isolation, persistence, presenter access, and provider execution still need verification with your deployment’s configuration. Passing local tests does not establish those hosted results.

The demo header includes a notification bell; connected mode hides sample notifications. Savings and workspace examples are labeled **Sample**; appearance/accessibility changes create real local system notices. Read status persists in this browser. `publishNotification` in `src/features/notifications/use-notifications.ts` is the future integration point: call it only after a confirmed change, use a stable event ID to avoid duplicates, and supply backend-provided goal values rather than calculating them in the browser. Notifications currently have no API connection or operating-system push permission.

Typography uses locally bundled Lato, with Comic Relief reserved for the HokieBird speech bubble. Font licenses are in `src/app/fonts/`; campus photo sources are documented in `public/campus/README.md`.

## Presentation

Run `npm run presentation:export` inside `frontend/` to create `presentation-dist/Hokie_Wallet_Presentation.html`. Open or share that single file directly; its images and fonts are embedded, so it does not need a running website or backend. External source and app links still need their destinations to be available.

The development route remains at <http://localhost:3000/present>. Both versions contain the current 495-word script in nine scenes across 240 seconds: Carlos presents 0:00–1:00, Neha 1:00–2:00, Grant 2:00–3:00, and Bilguun 3:00–4:00. The PowerPoint in `../docs/presentation/` is an older fallback with an earlier script.

Use the arrow keys for previous/next scenes, Space for the next scene, P to play/pause the automatic four-minute timeline, N for presenter notes, F for fullscreen, H to hide/show controls, and Home/End for the first/last scene. Notes are hidden in the default audience view, contain source links, and pause playback when opened. Close them before sharing the presentation screen. The reduced-motion toggle follows the system preference until the presenter overrides it.

Screenshots show the actual UI with sample data. Backend flows explain guest verification, Nessie sandbox/manual context, deterministic previews, explicit Supabase saves, and the signed ANS Coach-to-Planner path without making live requests. A provider-aware diagram separates AI intent parsing from calculated results and the Coach’s formatted explanation. The server supports explicitly selected VT ARC or OpenRouter; ARC remains the default, with no automatic provider fallback. A separate synthetic contract comparison replays a $150 purchase: $50 discretionary plus $100 from the selected Laptop goal, with its projected date moving from November 16 to November 23, 2026. Those values do not belong to the dashboard profile. The slideshow uses scripted examples; the product now includes authenticated frontend flows, while hosted end-to-end verification remains a deployment step. Asset credits are in `public/presentation/README.md`. See `../docs/presentation/README.md` for the speaker schedule, sponsor context, and rehearsal details.

## Layout

- `src/app/`: pages, global styles, and layout. Coordinate edits to shared files with the other frontend developer.
- `src/components/ui/`: reusable visual primitives.
- `src/features/`: feature-specific UI, including the dashboard, guest sessions, plan editors, demo and connected chat, and dining.
- `src/lib/api.ts`: all browser-to-backend requests; validates financial requests/responses with Zod, supplies bearer tokens, preserves safe error codes, and uses bounded request deadlines.
- `tests/`: API-client error handling and shared-contract checks.

The backend is a separate Fastify application. Do not put financial business logic, provider calls, or secret keys into Next.js route handlers. The Supabase guest session supplies a bearer token that the backend independently verifies.

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
