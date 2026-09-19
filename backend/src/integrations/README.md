# Provider adapters

Future server-only adapters belong here: Nessie (read-only sandbox banking), VT ARC (intent parsing and grounded explanations), and GoDaddy ANS (registration lookup and resolution).

Keep provider response types and credentials inside this boundary. Normalize financial data before passing it to the calculation engine. Implement timeouts, validation, redacted logs, and explicit unavailable/stale states. Do not register agents or provision sandbox accounts as a side effect of server startup.

No integration is implemented in this starter. Environment placeholders are documented in `backend/.env.example`.
