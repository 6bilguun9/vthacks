# Frontend features

Keep feature UI together here (future overview, goals, and chat). Coordinate ownership with the other frontend developer so you do not both change the same page or feature files at once.

`system/api-status.tsx` is the starter's live API check. Calls belong in `src/lib/api.ts`; provider credentials and financial calculations belong in the backend.

Use the synthetic examples in `contracts/examples/` while an endpoint is planned. Explicitly label any mock screen as sample data. Do not silently return a fixture when a live financial request fails. No financial feature is implemented in this starter.
