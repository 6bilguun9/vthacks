# Project boundaries

- Read the root README and the relevant app README before changing code.
- `frontend/` and `backend/` are independent npm applications. Keep source, dependencies, lockfiles, and config changes inside the relevant app whenever possible.
- Do not add a root npm workspace, shared lockfile, or runtime imports across app boundaries.
- Coordinate API changes through `contracts/`. Mark planned endpoints as planned; do not disguise stubs as working financial integrations.
- Backend owns financial calculations and all provider secrets. Frontend renders server results and may use explicitly labeled synthetic mocks.
- Follow the financial invariants in `docs/architecture.md`. All money is integer USD cents.
- Run `npm run check` in each affected app. Contract changes require both apps' checks.
- Never commit `.env` files, credentials, or private financial data.
- Use feature branches for follow-up work. Do not force-push shared branches or discard another teammate's changes.
- The individual backend work split has not been assigned yet.
