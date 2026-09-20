# Coach and planner

The coach interprets constrained financial questions with the configured AI provider and calls the deterministic planner. The planner owns calculation results; the coach does not invent them. Both are exposed as separate HTTP-API identities while sharing this Fastify deployment.

## Stable development seams

- `GET /api/v1/agents/coach` and `GET /api/v1/agents/planner` expose non-sensitive descriptors for the two registered identities.
- `POST /api/v1/agents/coach` runs the authenticated coach flow. `POST /api/v1/agents/planner` requires the guest bearer token plus the signed coach invocation and reloads owner-scoped state before calculating.
- Definitions, endpoint paths, function tags, and configured hosts live in `src/agents/registry.ts`. Add an agent capability there before registering it.
- GoDaddy ANS commands live in `scripts/`; their local CSRs, private keys, and registration state live under ignored `backend/.ans/`.

## Building the runtime

The coach resolves only the configured planner FQDN and version through ANS, rejects redirects, and signs the audience, body, timestamp, and single-use nonce. It never accepts an AI- or user-provided URL. ANS discovery is not user authorization and does not certify financial advice.

Keep the planner's financial engine deterministic and test it without ANS or an AI provider. The coach provides a grounded explanation of that engine result.
