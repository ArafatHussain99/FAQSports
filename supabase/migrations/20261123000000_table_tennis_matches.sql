-- Table tennis matches and their point-by-point scorecard.
-- Run in the Supabase SQL editor (or `supabase db push`) before using the
-- table tennis scorecard in the app. Safe to re-run: it updates the policies
-- of an existing table.
--
-- The whole score is derived in the app from `points` (one entry per rally)
-- and `game_setups` (who served first / who started on the right each game),
-- so undo is just removing the last point.

create table if not exists public.table_tennis_matches (
  id uuid primary key default gen_random_uuid(),
  format text not null check (format in ('single', 'double')),
  best_of smallint not null default 5 check (best_of in (1, 3, 5, 7)),
  points_to_win smallint not null default 11 check (points_to_win between 5 and 21),
  serves_per_turn smallint not null default 2 check (serves_per_turn between 1 and 10),
  -- Player ids (players.id). Text so mock/legacy ids also fit.
  team_a_player_ids text[] not null,
  team_b_player_ids text[] not null,
  venue text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'live', 'completed', 'cancelled')),
  -- [{ "firstServer": "A"|"B", "rightA": "<player id>", "rightB": "<player id>" }, ...] one per game
  game_setups jsonb not null default '[]'::jsonb,
  -- [{ "game": 0, "winner": "A"|"B", "serverId": "<player id>", "at": "<iso time>" }, ...]
  points jsonb not null default '[]'::jsonb,
  winner_side text check (winner_side in ('A', 'B')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint table_tennis_team_sizes check (
    (format = 'single' and cardinality(team_a_player_ids) = 1 and cardinality(team_b_player_ids) = 1)
    or (format = 'double' and cardinality(team_a_player_ids) = 2 and cardinality(team_b_player_ids) = 2)
  )
);

create index if not exists table_tennis_matches_status_idx
  on public.table_tennis_matches (status, created_at desc);

alter table public.table_tennis_matches enable row level security;

-- Admin check by signed-in user id (profiles.id = auth.uid()). Same definition
-- as 20261119000100_players_admin_update.sql; SECURITY DEFINER so it can read
-- profiles despite the "own row only" policy there.
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

-- Make sure signed-in users have the table privileges RLS then narrows down.
grant select, insert, update, delete on public.table_tennis_matches to authenticated;

-- Any signed-in user can view matches and scorecards.
drop policy if exists "table_tennis_matches_select" on public.table_tennis_matches;
create policy "table_tennis_matches_select"
  on public.table_tennis_matches for select
  to authenticated
  using (true);

-- Only admins can create, score or delete matches.
drop policy if exists "table_tennis_matches_admin_insert" on public.table_tennis_matches;
create policy "table_tennis_matches_admin_insert"
  on public.table_tennis_matches for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "table_tennis_matches_admin_update" on public.table_tennis_matches;
create policy "table_tennis_matches_admin_update"
  on public.table_tennis_matches for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "table_tennis_matches_admin_delete" on public.table_tennis_matches;
create policy "table_tennis_matches_admin_delete"
  on public.table_tennis_matches for delete
  to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- TROUBLESHOOTING "new row violates row-level security policy"
-- -----------------------------------------------------------------------------
-- 1. Is the account admin, and does profiles.id match the auth user id?
--      select u.id as auth_id, p.id as profile_id, p.email, p.role
--      from auth.users u left join public.profiles p on p.id = u.id
--      where u.email = '<your email>';
--    Expected: profile_id = auth_id and role = 'admin'.
--
-- 2. Simulate an insert as that user (rolled back):
--      begin;
--      set local role authenticated;
--      select set_config('request.jwt.claims',
--        json_build_object('sub', '<auth_id>', 'role', 'authenticated')::text, true);
--      select public.is_admin();   -- expected: true
--      insert into public.table_tennis_matches (format, team_a_player_ids, team_b_player_ids)
--        values ('single', array['a'], array['b']) returning id;
--      rollback;
--
-- 3. If both work but the app still fails: sign out and sign in again so the
--    app has a fresh Supabase session (the cached role alone isn't a sign-in).
