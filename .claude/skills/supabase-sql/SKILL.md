---
name: supabase-sql
description: Write SQL for the FAQ Sports Supabase database, either a schema/RLS migration in supabase/migrations/ or a one-off data script (bulk-adding players, assigning teams, fixing rows) for the SQL editor. Use when a change needs new columns, constraints, enums, RLS policies or triggers, or when the user asks for SQL to change data.
---

# Supabase SQL

Read `docs/DATABASE_SCHEMA.md` (§6 mismatches, §7 enums, delete rules, RLS, triggers) and `docs/supabase-schema.sql` first.

**Never run SQL against the database yourself.** Write it; the user reviews and runs it in the Supabase SQL editor.

## A. Schema or RLS change → migration file

File: `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_name>.sql`. Follow `20261119000000_lock_profile_role.sql`:

1. **Header comment:** the problem (link the finding ID, e.g. R2, D7), the fix, what is *not* affected, and `Status: written <date> for review. NOT applied.`
2. **Pre-checks** (commented, read-only): queries that show whether existing data would break the change (e.g. values outside a new check constraint).
3. **Migration** in one `begin; … commit;`.
4. **Verification** (commented): simulate a user and show the expected result:
   ```sql
   begin;
   set local role authenticated;
   select set_config('request.jwt.claims',
     json_build_object('sub', '<user-uuid>', 'role', 'authenticated')::text, true);
   -- statement and expected outcome
   rollback;
   ```
5. **Rollback** (commented).

Rules:

- RLS: check the admin role with a `security definer` helper such as `public.is_admin()` (sketch in `docs/DATABASE_SCHEMA.md` §7.3); create it in the first migration that needs it.
- Column privileges: a column-level `revoke` does nothing while a table-level grant exists. Revoke the table privilege, then grant columns.
- New enum values: `alter type … add value` can't run inside a transaction block on older Postgres; put it in its own migration.
- Prefer additive changes. Changing a column type (e.g. `best_bowling_*` text → integer) needs a `using` clause and a pre-check for non-numeric values.
- Keep each migration to one concern.

After writing it, update `docs/DATABASE_SCHEMA.md` (the affected table, §6/§7, and note "not applied"), and `docs/supabase-schema.sql` once the user confirms it's applied.

## B. Data change → script for the SQL editor

For one-off data (adding players, assigning teams, correcting rows). Give it in chat; don't commit it to the repo (it contains people's names).

- Wrap in `begin; … commit;`.
- Make it safe to run twice: `where not exists (…)`, matching names with `lower()`.
- Keep related rows consistent, e.g. every new `players` row gets a `player_stats` row:
  ```sql
  with inserted as (
    insert into public.players (name)
    select v.name from (values ('Jane Doe'), ('John Roe')) as v(name)
    where not exists (select 1 from public.players p where lower(p.name) = lower(v.name))
    returning id
  )
  insert into public.player_stats (player_id) select id from inserted;
  ```
- Use exact enum values (`players.position`: `Batsman`, `Bowler`, `All-rounder`, `Wicketkeeper`).
- Look up IDs by name in a subquery rather than pasting uuids.
- Before deletes, check the delete rules in §7.2. Deleting a player also deletes their past scorecard rows.
- Always add a read-only query to check the result.
