# Provider adapters

Server-only adapters belong here: Nessie (read-only sandbox banking), VT ARC (intent parsing and grounded explanations), and GoDaddy ANS (agent registration and resolution).

`ans-cli.ts` is the ANS boundary. It invokes the supported `ans-cli` process with the configured production URL and optional complete `KEY:SECRET` credential pair. Registration is invoked only through a manual CLI command, never on server startup. The raw key is never passed to browser code or committed.

Keep provider response types and credentials inside this boundary. Normalize financial data before passing it to the calculation engine. Implement timeouts, validation, redacted logs, and explicit unavailable/stale states.
