# Database migrations

`202609190001_private_state.sql` is the executable Supabase migration for private guest state. It creates guest profiles, immutable financial snapshots, the current plan and plan revisions, idempotency records, operational rate/lease/nonce tables, owner-scoped read policies, and service-role-only mutation and limit functions.

Apply it through the Supabase migration runner before using private API routes. The backend does not provision a database on startup. Place future versioned SQL migrations here, use unique timestamped filenames, and never rewrite a migration another teammate has applied.

Coordinate future database changes within the backend team.
