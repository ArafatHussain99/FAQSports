---
paths:
  - "api/**"
  - "sports/*/api.ts"
  - "sports/*/context.tsx"
  - "context/**"
  - "types/**"
---

# Data access (Supabase, contexts, types)

References: `docs/API_DOCUMENTATION.md`, `docs/DATABASE_SCHEMA.md`, `docs/AUTHENTICATION.md`.

- Use the shared client from `@/api/supabaseClient`. Never create another client or use a secret/service_role key.
- Function pattern: call Supabase → on error `console.error` and `throw` → map snake_case rows to camelCase app types inside the function. Callers handle errors.
- Don't `console.log` row data or keys (existing logs in `getUserRole` and `getMatches` are known issues).
- Check table and column names against `docs/supabase-schema.sql` (real export, 2026-11-19), mismatches D1–D18 in `docs/DATABASE_SCHEMA.md` §6, and enums, delete rules, RLS policies and triggers in §7. Send enum values exactly (case-sensitive). Whether RLS is on per table and what `handle_new_user()` does are still unknown; ask, don't assume.
- All IDs are database-generated `uuid`s. Never send app-made IDs (`match_<timestamp>`) or mock IDs (`t1`, `p1`).
- If the schema needs to change, say so and write the SQL as a new file in `supabase/migrations/` (`<YYYYMMDDHHMMSS>_<name>.sql`, with pre-checks, verification and rollback, like the existing one). Never apply it yourself; the user reviews and runs it. Don't work around a missing column in app code.
- Check the table name in every delete: `deletePlayerInfo` currently deletes from `teams` (known bug).
- `await` every write and check its result before reporting success. An update or delete denied by RLS returns success with 0 rows; use `.select()` and check the rows came back.
- Multi-step writes (e.g. `players` then `player_stats`) aren't atomic; handle partial failure.
- Authorization: the client role comes from AsyncStorage and can be edited, and no RLS policy checks the admin role yet. A new admin-only write needs an RLS policy too; propose the SQL (see `docs/DATABASE_SCHEMA.md` §7.3) rather than relying on UI checks.
- `DataProvider` copies query data into `useState` seeded from mocks. Prefer reading React Query data directly in new code.
- When you add or change an API function or table, update `docs/API_DOCUMENTATION.md` and `docs/DATABASE_SCHEMA.md`.
