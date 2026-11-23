-- =============================================================================
-- Player nickname and cover picture
-- =============================================================================
-- Feature: the Player Profile screen (app/player/[id].tsx) shows a cover
-- picture and a nickname, and admins can edit both.
--
-- Design:
--   - Cover images are NOT stored in Supabase. They are bundled with the app in
--     assets/images/player-covers/ and listed in constants/playerCovers.ts.
--     The database stores only the image's key (e.g. 'table-tennis-smash').
--     A key the app doesn't know is ignored (initial-letter avatar shown).
--   - nickname: free text, 1–30 characters, or null.
--
-- Changes:
--   1. players.nickname         text, 1–30 chars after trimming, nullable
--   2. players.cover_image_key  text, lowercase letters, digits and dashes, nullable
--
-- Not affected: existing rows (both columns start as null), existing policies.
-- Who can edit: admins, through the "Admins update players" policy from
--   20261119000100_players_admin_update.sql. Apply that (and the role-lock
--   migration before it) first, or saves will be rejected.
--
-- Status: written 2026-11-19 for review. NOT applied.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PRE-CHECKS (read-only)
-- -----------------------------------------------------------------------------
-- a) Columns don't exist yet (expected: 0 rows).
--      select column_name from information_schema.columns
--      where table_schema = 'public' and table_name = 'players'
--        and column_name in ('nickname', 'cover_image_key');
--
-- b) The admin update policy exists (expected: one row).
--      select policyname from pg_policies
--      where schemaname = 'public' and tablename = 'players' and cmd = 'UPDATE';


-- -----------------------------------------------------------------------------
-- MIGRATION
-- -----------------------------------------------------------------------------
begin;

alter table public.players
  add column nickname text,
  add column cover_image_key text;

alter table public.players
  add constraint players_nickname_length
    check (nickname is null or char_length(btrim(nickname)) between 1 and 30),
  add constraint players_cover_image_key_format
    check (cover_image_key is null or cover_image_key ~ '^[a-z0-9-]{1,60}$');

comment on column public.players.nickname is
  'Display nickname shown on the player profile. 1-30 characters.';
comment on column public.players.cover_image_key is
  'Key of a cover image bundled with the app (constants/playerCovers.ts). Not a URL.';

commit;


-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------
-- Columns and constraints exist:
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'players'
--     and column_name in ('nickname', 'cover_image_key');
--
-- As an admin (rolled back; replace <admin-uuid> and <player-id>):
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     json_build_object('sub', '<admin-uuid>', 'role', 'authenticated')::text, true);
--   update public.players
--     set nickname = 'Smasher', cover_image_key = 'table-tennis-smash'
--     where id = '<player-id>' returning id, nickname, cover_image_key;   -- expected: 1 row
--   update public.players set cover_image_key = 'Bad Key!' where id = '<player-id>';
--   -- expected: ERROR violates check constraint "players_cover_image_key_format"
--   rollback;
--
-- Then in the app: open a player as admin → Edit → set nickname and picture → Save.


-- -----------------------------------------------------------------------------
-- ROLLBACK (deletes any nicknames and picture choices saved since)
-- -----------------------------------------------------------------------------
--   begin;
--   alter table public.players
--     drop constraint if exists players_nickname_length,
--     drop constraint if exists players_cover_image_key_format,
--     drop column if exists nickname,
--     drop column if exists cover_image_key;
--   commit;
