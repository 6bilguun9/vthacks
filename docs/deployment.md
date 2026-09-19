# Deployment and integration runbook

The starter is configured for independent deployments, but this setup does not provision cloud resources, register domains, create Supabase tables, or connect financial/AI services.

## Two Vercel projects, one repository

| Setting | Frontend project | Backend project |
| --- | --- | --- |
| Repository | `6bilguun9/vthacks` | `6bilguun9/vthacks` |
| Root directory | `frontend` | `backend` |
| Framework | Next.js | Fastify |
| Node version | 24.x | 24.x |
| Install | `npm ci` | `npm ci` |
| Build | `npm run build` | `npm run build` |
| Entry | Next.js App Router | `src/index.ts` |

Deploy the backend first, then set `NEXT_PUBLIC_API_BASE_URL` in the frontend to the backend HTTPS origin. Set backend `CORS_ORIGINS` to the exact frontend HTTPS origin and `HOST=0.0.0.0`. For known preview URLs, add each explicitly; do not broadly allow all Vercel domains. Rebuild the frontend after changing its public API URL.

Check `/api/v1/health` directly and through the frontend connection card. Liveness does not establish Nessie, ARC, Supabase, or ANS readiness. Provider failures must never be reported as connected simply because the health endpoint works.

Docs: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Fastify on Vercel](https://vercel.com/docs/frameworks/backend/fastify).

## First integration milestone

1. **Nessie:** obtain the team's sandbox credentials and current HTTPS API base URL. Read a configured sample customer's accounts and transaction resources; validate actual shapes and balance/status semantics. The public portal returned 403 in the planning environment, so live access is not verified. Keep runtime banking calls read-only.
2. **ARC:** create a personal key through the documented VT interface and store it only in backend environment configuration. Test a small `/chat/completions` request and constrained JSON parsing. Default to `gpt-oss-120b` with low reasoning effort; model availability and limits can change. Verify app-mediated public guest usage with ARC; personal access documentation alone does not establish unrestricted proxy permission. Until confirmed, limit AI to the authorized presenter while keeping the deterministic public demo available.
3. **Supabase:** provision the project, implement migrations and RLS, enable anonymous sessions, and test two-user isolation. No executable migrations ship in this starter. Public signup needs server-verified Turnstile and limits before release.
4. **GoDaddy ANS:** establish a domain the team controls and the correct registration credentials. Current public docs show both PAT and legacy key guidance, so verify the issued credential type with the actual endpoint. Never guess credentials or fall back across unrelated services.

## ANS topology

Use `coach.<team-domain>` and `planner.<team-domain>` as distinct registered hosts, both attached to the backend deployment. Implement their HTTP-API endpoints before registration. Complete the domain challenge and required certificate steps, then verify active registry status and resolution. Keep private signing keys out of Git.

The coach must actually use the resolved planner URL. Restrict destinations to configured HTTPS hosts, disable arbitrary redirects, and authenticate bounded requests. Expose only non-sensitive registration and call-status information in the UI. Registration is not a certification of financial correctness.

## Public release gate

The financial app should not be described as ready for public use until authorization/RLS, provider handling, signup protection, persistent rate limits, snapshot freshness, explicit saves, and all financial invariants are implemented and checked. These are subsequent feature tasks, not capabilities of this starter.

Environment examples contain placeholders only. No paid service tier or domain purchase is implied; use existing access or sponsor credits and check costs before provisioning. Keep initial deployment small, track request timing/error categories without financial payloads, and retain a clearly labeled offline sample fallback for the demonstration.
