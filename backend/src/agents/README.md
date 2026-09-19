# Coach and planner

The future coach interprets requests with VT ARC and resolves the planner through GoDaddy ANS. The planner exposes the deterministic engine through authenticated HTTPS calls.

Both agents will live in the backend deployment, with separate registered subdomains. Restrict resolved destinations to configured agent hosts. Signed requests must bind the audience, payload, expiry, and nonce. ANS discovery does not replace user authorization or certify financial advice.

No agent endpoint or registration is implemented yet.
