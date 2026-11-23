-- =============================================================================
-- Lock profiles.role so users can't make themselves admin
-- =============================================================================
-- Problem (docs/DATABASE_SCHEMA.md §7.3, finding R1):
--   The RLS policy "Users update own profile" lets a signed-in user update any
--   column of their own row, including `role`. "Users insert own profile" lets
--   them create their row with any role. Both are reachable with the public
--   (publishable) key that ships in the app, e.g.
--     PATCH /rest/v1/profiles?id=eq.<own id>   { "role": "admin" }
--
-- Fix:
--   1. Only allow the values the app understands: 'admin', 'player' (or null).
--   2. Remove the table-wide INSERT/UPDATE privileges that Supabase grants to
--      `anon` and `authenticated`, and grant back only the columns users may
--      set themselves. `role`, `email` and `id` are not among them.
--      (A column-level REVOKE alone does nothing while the table-level grant
--      exists, which is why the whole privilege is revoked first.)
--
-- Not affected:
--   - The existing RLS policies (they still limit users to their own row).
--   - The app: it never inserts or updates `profiles`; it only reads `role`.
--   - The sign-up trigger `handle_new_user()` and the Supabase dashboard / SQL
--     editor, which run as privileged roles, not as `anon`/`authenticated`.
--   - Changing a role as an admin of the project: do it in the SQL editor or
--     Table editor (see "Granting admin" at the bottom).
--
-- Status: written 2026-11-19 for review. NOT applied.
-- Run the pre-checks first, then the migration, then the verification.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PRE-CHECKS (read-only; run these first and review the output)
-- -----------------------------------------------------------------------------
-- a) Every current role value. Anything other than 'admin', 'player' or null
--    makes step 1 fail; fix those rows first.
--      select role, count(*) from public.profiles group by role order by role;
--
-- b) Who is admin now. Because of this hole, confirm each one is meant to be.
--      select id, email, full_name, role, updated_at
--      from public.profiles where role = 'admin' order by updated_at desc;
--
-- c) Current privileges on profiles (to compare after).
--      select grantee, privilege_type, column_name
--      from information_schema.column_privileges
--      where table_schema = 'public' and table_name = 'profiles'
--        and grantee in ('anon', 'authenticated')
--      order by grantee, privilege_type, column_name;


-- -----------------------------------------------------------------------------
-- MIGRATION
-- -----------------------------------------------------------------------------
begin;

-- 1. Restrict role values (replaces any existing constraint of the same name,
--    so the migration can be re-run).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role is null or role in ('admin', 'player'));

-- 2. Signed-out users never write profiles.
revoke insert, update on public.profiles from anon;

-- 3. Signed-in users may only write their own non-privileged columns.
--    RLS policies still restrict them to their own row (id = auth.uid()).
revoke insert, update on public.profiles from authenticated;

grant insert (id, full_name, avatar_url, favorite_team_id)
  on public.profiles to authenticated;

grant update (full_name, avatar_url, favorite_team_id)
  on public.profiles to authenticated;

commit;


-- -----------------------------------------------------------------------------
-- VERIFICATION (run after the migration; replace <player-uuid> with the id of
-- a NON-admin user from public.profiles)
-- -----------------------------------------------------------------------------
-- Simulates a request from that user. Everything is rolled back.
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<player-uuid>', 'role', 'authenticated')::text, true);
--
--   -- Expected: ERROR 42501 permission denied for table profiles
--   update public.profiles set role = 'admin' where id = '<player-uuid>';
--   rollback;
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<player-uuid>', 'role', 'authenticated')::text, true);
--
--   -- Expected: UPDATE 1 (allowed columns still work)
--   update public.profiles set full_name = full_name where id = '<player-uuid>';
--   rollback;
--
-- Then in the app: sign in as a player and an admin and check both still load
-- their role, and sign up a new account and check its profile row is created.


-- -----------------------------------------------------------------------------
-- GRANTING ADMIN (from now on)
-- -----------------------------------------------------------------------------
-- Run in the SQL editor (privileged), not from the app:
--   update public.profiles set role = 'admin' where email = 'someone@example.com';
-- The user must sign out and in again; the app caches the role on the device.


-- -----------------------------------------------------------------------------
-- ROLLBACK (restores Supabase's default table-wide grants)
-- -----------------------------------------------------------------------------
--   begin;
--   alter table public.profiles drop constraint if exists profiles_role_check;
--   grant insert, update on public.profiles to anon, authenticated;
--   commit;
