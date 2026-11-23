-- =============================================================================
-- Let admins update players (fixes "Change Team" permission error)
-- =============================================================================
-- Problem (docs/DATABASE_SCHEMA.md §7.3, D18):
--   RLS is on for public.players, but the only policy is "Public read players"
--   (SELECT). There is no UPDATE policy, so every update from the app changes
--   0 rows. The Teams tab's Change Team (api/playerApi.ts updatePlayerTeam)
--   reports: "You may not have permission to update players".
--
-- Fix:
--   1. public.is_admin(): true when the signed-in user's profiles.role is
--      'admin'. SECURITY DEFINER so it can read profiles despite the
--      "own row only" policy there. Reused by later admin policies.
--   2. An UPDATE policy on public.players for admins only.
--
-- Not affected:
--   - Reads (still public), inserts and deletes on players (no change).
--   - Non-admin users: their updates still change 0 rows.
--
-- Depends on: 20261119000000_lock_profile_role.sql. Apply that FIRST.
--   Without it, any user can set their own role to 'admin' and pass this check.
--
-- Status: written 2026-11-19 for review. NOT applied.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PRE-CHECKS (read-only)
-- -----------------------------------------------------------------------------
-- a) RLS is on for players (expected: true) and the existing policies.
--      select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'players';
--      select policyname, cmd, roles, qual, with_check
--      from pg_policies where schemaname = 'public' and tablename = 'players';
--
-- b) The role-lock migration is applied (expected: one row, profiles_role_check).
--      select conname from pg_constraint where conname = 'profiles_role_check';
--
-- c) Your account is admin (expected: 'admin').
--      select role from public.profiles where email = '<your email>';
--
-- d) authenticated has the UPDATE privilege on players (Supabase default; expected: one row).
--      select privilege_type from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'players'
--        and grantee = 'authenticated' and privilege_type = 'UPDATE';


-- -----------------------------------------------------------------------------
-- MIGRATION
-- -----------------------------------------------------------------------------
begin;

-- 1. Admin check helper.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Admins may update players.
drop policy if exists "Admins update players" on public.players;
create policy "Admins update players"
  on public.players
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;


-- -----------------------------------------------------------------------------
-- VERIFICATION (everything rolled back)
-- -----------------------------------------------------------------------------
-- As an ADMIN (replace <admin-uuid> and <player-id>):
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<admin-uuid>', 'role', 'authenticated')::text, true);
--   update public.players set team_id = team_id where id = '<player-id>' returning id;
--   -- Expected: one row returned
--   rollback;
--
-- As a NON-ADMIN (replace <player-user-uuid>):
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<player-user-uuid>', 'role', 'authenticated')::text, true);
--   update public.players set team_id = team_id where id = '<player-id>' returning id;
--   -- Expected: 0 rows
--   rollback;
--
-- Then in the app (signed in as admin): Teams → Players → Change Team → Save.
-- If it still fails, sign out and in again so the app has a fresh session.


-- -----------------------------------------------------------------------------
-- ROLLBACK
-- -----------------------------------------------------------------------------
--   begin;
--   drop policy if exists "Admins update players" on public.players;
--   drop function if exists public.is_admin();   -- only if no other policy uses it
--   commit;
