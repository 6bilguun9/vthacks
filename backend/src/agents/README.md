# Coach and planner

The coach will interpret constrained financial questions with VT ARC and call the deterministic planner. The planner owns calculation results; the coach must not invent them. Both are exposed as separate HTTP-API identities, while sharing this Fastify deployment.

## Stable development seams

- `GET /api/v1/agents/coach` and `GET /api/v1/agents/planner` expose non-sensitive descriptors for the two registered identities.
- `POST` to either endpoint deliberately returns `501 AGENT_NOT_IMPLEMENTED` until its owner builds the runtime. This prevents a sponsor registry entry from implying that financial advice is ready.
- Definitions, endpoint paths, function tags, and configured hosts live in `src/agents/registry.ts`. Add an agent capability there before registering it.
- GoDaddy ANS commands live in `scripts/`; their local CSRs, private keys, and registration state live under ignored `backend/.ans/`.

## Building the runtime

The agent owner should add a narrow request schema and deterministic result schema before adding a `POST` handler. The coach's eventual remote call must resolve only the configured planner FQDN, reject redirects, sign audience/body/expiry/nonce, and never accept an LLM- or user-provided URL. ANS discovery is not user authorization and does not certify financial advice.

Keep the planner's financial engine deterministic and test it without ANS or ARC. The coach can then provide a grounded explanation of that engine result.
