# Deployment and integration runbook

The applications use independent deployments. Backend code and executable migrations are included, but cloud provisioning, applying hosted migrations, registration/DNS, and live provider verification remain operator steps. See [the backend handoff](backend-handoff.md).

## Two Vercel projects, one repository

| Setting | Frontend project | Backend project |
| --- | --- | --- |
| Repository | `6bilguun9/vthacks` | `6bilguun9/vthacks` |
| Root directory | `frontend` | `backend` |
| Framework | Next.js | Other (Node Function wrapping Fastify) |
| Node version | 24.x | 24.x |
| Install | `npm ci` | `npm ci` |
| Build | `npm run build` | Disabled in Vercel; CI still runs `npm run check` |
| Entry | Next.js App Router | `api/function.ts` via `/api/v1/*` rewrite |

Deploy the backend first, then set `NEXT_PUBLIC_API_BASE_URL` in the frontend to the backend HTTPS origin. Set backend `CORS_ORIGINS` to the exact frontend HTTPS origin. Vercel invokes `api/function.ts` directly, so its deployment does not use `HOST` or `PORT`; those variables remain available for local/container listening through `src/index.ts`. For known preview URLs, add each explicitly; do not broadly allow all Vercel domains. Rebuild the frontend after changing its public API URL.

Check `/api/v1/health` directly and through the frontend connection card. Liveness does not establish Nessie, the selected AI provider, Supabase, or ANS readiness. Provider failures must never be reported as connected simply because the health endpoint works.

Docs: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Fastify on Vercel](https://vercel.com/docs/frameworks/backend/fastify).

## First integration milestone

1. **Nessie:** run `npm run nessie:status` with sandbox credentials, then select/provision a synthetic customer and set `NESSIE_CUSTOMER_ID`. The last development probe authenticated but returned no customers. Verify an authorized refresh with populated sandbox accounts; runtime banking calls are read-only.
2. **AI provider:** set `AI_PROVIDER=arc` with an ARC credential or `AI_PROVIDER=openrouter` with an OpenRouter credential; never configure both as an automatic data-bearing fallback. Store credentials only in the backend. Test a small `/chat/completions` request and constrained JSON parsing, then verify the selected model, privacy settings, limits, and app-mediated public-use terms. Until confirmed, limit AI to the authorized presenter while keeping the deterministic public demo available.
3. **Supabase:** provision the project, apply `backend/supabase/migrations/202609190001_private_state.sql`, and configure the backend URL/publishable/secret keys. Enable anonymous sign-ins and Supabase Auth CAPTCHA with Turnstile. Local PostgreSQL tests verify RLS/atomic writes, but two-user isolation and browser signup must also be checked on the hosted project.
4. **GoDaddy ANS:** establish a domain the team controls and install the ANS CLI. The checked-in wrappers point it at `https://api.godaddy.com/` (production), not the CLI's default OTE environment. Store only the complete `ANS_API_KEY=KEY:SECRET` pair in backend deployment secrets or ignored `backend/.env`; a key without its matching secret cannot authenticate the CLI.

## ANS topology

Use `coach.<team-domain>` and `planner.<team-domain>` as distinct registered hosts, both attached to the backend deployment. Route both FQDNs to this backend with valid HTTPS before registration. Descriptor and invocation routes are implemented. Configure the shared signing secret; the planner requires both the verified guest token and a timestamped, single-use signed request. Descriptors do not certify ACTIVE registration.

From `backend/`, set `ANS_BASE_URL=https://api.godaddy.com/`, `ANS_API_KEY=KEY:SECRET`, `COACH_AGENT_HOST`, and `PLANNER_AGENT_HOST` in ignored `.env`, then run this sequence independently for each identity:

```sh
npm run ans:csr -- coach coach.example.com
npm run ans:register -- coach
# Create the emitted ACME TXT record, wait for it to propagate, then:
npm run ans:verify-acme -- <agent-id>
# Publish the emitted _ans and _ans-badge TXT records, then:
npm run ans:verify-dns -- <agent-id>
npm run ans:status -- <agent-id>
npm run ans:resolve -- coach
```

Repeat for `planner`. CSR keys stay in ignored `.ans/`; the registration command's output is the source of truth for the exact agent ID and DNS records. Publish both required ANS TXT records (`_ans` and `_ans-badge`) before the DNS verification step. Complete validation, confirm `ACTIVE`, and verify resolution before using ANS in the coach runtime.

The coach must actually use the resolved planner URL. Restrict destinations to configured HTTPS hosts, disable arbitrary redirects, and authenticate bounded requests. Expose only non-sensitive registration and call-status information in the UI. Registration is not a certification of financial correctness.

## Public release gate

The financial app should not be described as ready for public use until authorization/RLS, provider handling, signup protection, persistent rate limits, snapshot freshness, explicit saves, and financial invariants pass in the hosted environment. Keep AI presenter-only until app-mediated usage with the selected provider is approved. Provider-mocked tests and isolated PostgreSQL checks are necessary but do not replace hosted verification.

Environment examples contain placeholders only. No paid service tier or domain purchase is implied; use existing access or sponsor credits and check costs before provisioning. Keep initial deployment small, track request timing/error categories without financial payloads, and retain a clearly labeled offline sample fallback for the demonstration.
