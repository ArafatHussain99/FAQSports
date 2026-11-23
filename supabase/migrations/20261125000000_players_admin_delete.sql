-- =============================================================================
-- Let admins delete players (and, through existing cascades, their stats)
-- =============================================================================
-- Problem (docs/DATABASE_SCHEMA.md §7.3, D9 / D18):
--   RLS is on for public.players, but there is no DELETE policy. A delete from
--   the app (Teams tab -> swipe -> Delete) returns success with 0 rows, and
--   deletePlayerInfo() reports "The player wasn't deleted".
--
-- Fix:
--   One DELETE policy on public.players for admins (public.is_admin(), created
--   in 20261119000100). Nothing else is needed for the stats: the foreign keys
--   already cascade a player delete, and cascades are not filtered by RLS.
--
-- What a player delete removes (docs/DATABASE_SCHEMA.md §7.2, plus 20261124000000):
--   - player_stats, player_ratings, player_performances, match_squads
--   - batting_scorecards, bowling_scorecards, fall_of_wickets rows for them
--   - player_match_stats rows: their runs/wickets disappear from every team's
--     history and from "Teams played for"
--   - sport_award_recipients rows (they lose any champion recognition); a
--     table tennis award held by that player is deleted too
--   and sets to null: teams.captain_player_id and player references in innings
--   and ball_events.
--   Deleting can't be undone. For someone who has played, consider moving them
--   to no team instead (REQUIREMENTS.md open question 18).
--
-- Not affected:
--   - Who can read players (unchanged), who can update them (20261119000100).
--   - Non-admins: still can't delete (0 rows, the app shows the error).
--
-- Status: written 2026-11-25 for review. NOT applied.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PRE-CHECKS (read-only)
-- -----------------------------------------------------------------------------
-- a) is_admin() exists (expected: one row).
--      select proname from pg_proc where proname = 'is_admin';
--
-- b) authenticated has the DELETE privilege on players (Supabase default; expected: one row).
--      select privilege_type from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'players'
--        and grantee = 'authenticated' and privilege_type = 'DELETE';
--
-- c) Existing policies on players (expect "Public read players" and "Admins update players").
--      select policyname, cmd from pg_policies
--      where schemaname = 'public' and tablename = 'players';


-- -----------------------------------------------------------------------------
-- MIGRATION
-- -----------------------------------------------------------------------------
begin;

drop policy if exists "Admins delete players" on public.players;
create policy "Admins delete players"
  on public.players
  for delete
  to authenticated
  using (public.is_admin());

commit;


-- -----------------------------------------------------------------------------
-- VERIFICATION (rolls back; nothing is deleted)
-- -----------------------------------------------------------------------------
-- Replace <admin-uuid> / <player-uuid> with real ids (profiles.id of an admin,
-- players.id of any player). Expected: "DELETE 1" for the admin, "DELETE 0"
-- for a non-admin.
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<admin-uuid>', 'role', 'authenticated')::text, true);
--   delete from public.players where id = '<player-uuid>';
--   select count(*) from public.player_stats where player_id = '<player-uuid>';  -- 0: cascaded
--   rollback;
--
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<non-admin-uuid>', 'role', 'authenticated')::text, true);
--   delete from public.players where id = '<player-uuid>';                        -- DELETE 0
--   rollback;


-- -----------------------------------------------------------------------------
-- ROLLBACK
-- -----------------------------------------------------------------------------
--   drop policy if exists "Admins delete players" on public.players;
