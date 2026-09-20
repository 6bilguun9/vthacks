# Backend MVP integration handoff

The backend implements guest-owned financial planning. Cloud activation is a separate step: health does not prove that Supabase, Nessie, ARC, or ANS is configured. All banking data is sandbox or explicitly requested synthetic fixture data. No financial account mutation endpoints exist.

## Local verification

Use Node 24 and run `npm ci`, `npm run check`, and `npm run test:db` from `backend`. The database test requires Docker and starts an isolated PostgreSQL container with a minimal Supabase auth/role test harness; it does not contact or modify a hosted project. The container is removed at completion. This verifies PostgreSQL policies and transactions, not hosted Supabase authentication or PostgREST configuration.

`npm run nessie:status` reads sandbox customer IDs without printing credentials. If it returns an empty list, create a synthetic test customer in the team's Nessie sandbox setup, then set `NESSIE_CUSTOMER_ID` in ignored backend configuration. Runtime banking integration only performs GET requests; provisioning test data is separate.

## Frontend connection sequence

1. Configure public Supabase URL/publishable key and Turnstile site key. Enable anonymous sign-ins and CAPTCHA in Supabase Auth. Use the Supabase browser client to create/refresh the session with its CAPTCHA token. Never ship a secret/service key to the browser.
2. Send `Authorization: Bearer <access_token>` on private backend requests. Keep the Supabase session in that browser; clearing it can lose access to the anonymous plan.
3. POST `/api/v1/session/bootstrap` with `{ "source": "fixture" }` once. It is retry-safe and returns an existing guest's state unchanged. This is the explicit sample-data choice, not a silent provider-error fallback.
4. GET `/api/v1/overview`. Render source labels, timestamps, projection warnings, and `capabilities`. The response omits internal Nessie customer IDs.
5. Ask the user to select checking/savings accounts, confirm income/expense completeness, current weekly discretionary remainder, cash buffer, and goals. Pass the returned plan with edits to `/api/v1/plan/preview`.
6. Save only from an explicit action with `/api/v1/plan/commit`, the current version/snapshot, a unique idempotency key, and `change.kind=replace_plan`. Reuse the same key and exact body when retrying a failed connection. A `409` requires reloading and previewing again.
7. For spending/extra savings, POST `/api/v1/scenarios`. Show `before`, nullable `after`, funding, goal impacts, recovery affordability, and assumptions. To save a valid result, commit `change.kind=apply_scenario` with the original scenario inputs. The server recalculates; the scenario ID is not authorization.
8. POST `/api/v1/data/manual` to save campus balances/charges. It returns a new snapshot and incremented plan version. A Nessie refresh also changes the snapshot/version; reload overview afterward.

Both preview and chat are non-mutating. Creating/editing a goal is a proposed full-plan change, not a separate goal write API. Do not modify `plannedPurchases` or `extraContributions` through `replace_plan`; use scenarios or reconciliation.

## Data and reconciliation

The current discretionary period starts Monday in America/New_York. Confirm the remaining amount for that period and include its confirmation timestamp; future periods use `weeklyDiscretionaryCents`. Empty income/expense arrays only mean zero when the corresponding completeness flags are true.

Manual campus entries include an explicit `asOf` timestamp. Missing university due dates remain null and prevent a confident affordability result. Restricted balances are not spendable bank cash. Link a tuition charge to its goal to avoid counting the same funding twice.

Saved hypothetical purchases remain planned expenses. After a new bank snapshot may include them, reconcile explicitly using `change.kind=reconcile_purchase`: `purchaseId`, `action` (`match` or `cancel`), and `transactionId` (null for cancellation). Matching requires an owned completed transaction for the same amount in a selected account and rejects a previously matched transaction. Confirming a goal-funded payment reduces that goal's confirmed allocation once. Confirming a discretionary payment requires confirming the current remaining allowance again. Canceling an unexecuted plan does not change bank cash.

## AI and ANS

Default `AI_MODE=off`. For the authorized presentation set `AI_MODE=presenter` and `PRESENTER_USER_IDS` to the comma-separated verified Supabase user IDs. Both `/chat` and `/dining-plans` require the guest token and presenter permission. The existing frontend dining client needs that header before it can use the protected endpoint.

Configure ARC only in the backend. Goal/purchase calculations come from deterministic code; dining meal prices remain estimates and their totals are recomputed. ARC failures direct the user to structured planning inputs. Missing dates/goals produce clarification rather than invented values.

Set the configured coach/planner hosts, ANS production key, and a random signing secret of at least 32 characters. Runtime ANS resolution uses HTTPS and the configured planner endpoint, not a CLI subprocess. Planner requests carry the guest bearer token plus signed audience, timestamp, body, and single-use nonce. POST bodies use `ScenarioRequest` directly. Registration/DNS validation still uses the existing maintenance scripts.

`PLANNER_ALLOW_LOCAL_FALLBACK=false` is the default. When deliberately enabled, the response identifies `executionSource=local_fallback`. Only `ans_remote` from an actual resolution and successful signed request establishes the sponsor demonstration. Agent descriptors do not claim ACTIVE registration.

## Hosted activation checklist

- Add Supabase URL, publishable key, and secret key to backend deployment configuration. Apply the SQL migrations through an authorized Supabase database session. Enable anonymous authentication plus CAPTCHA.
- Deploy the separate backend Vercel project rooted at `backend`, Node 24; set `HOST=0.0.0.0` and exact frontend `CORS_ORIGINS`. Add known preview origins individually.
- Set frontend `NEXT_PUBLIC_API_BASE_URL` to the backend origin and rebuild. Keep provider keys out of public variables.
- Select/provision the Nessie sandbox customer and verify refresh with authorized guest state.
- Attach both agent hosts to the backend, complete TLS and the returned DNS challenges/ANS records, verify ACTIVE, and smoke-test real resolution and signed planning.
- Test two distinct browser guests, explicit save/reload, stale-version rejection, provider failure, and presenter restrictions on the hosted deployment.

## Backend teammate split

- Backend developer 1: authentication/storage, Nessie/manual snapshots, HTTP orchestration, deployment, integration checks.
- Backend developer 2: financial engine, scenario correctness, ARC coach/dining, ANS runtime and sponsor demonstration.
- Coordinate shared contracts, environment definitions, route composition, and dependency changes before editing. Each developer uses a separate feature branch. Frontend developers retain frontend ownership.
