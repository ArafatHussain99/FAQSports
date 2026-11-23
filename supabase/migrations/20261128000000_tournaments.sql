-- =============================================================================
-- Tournaments: league table, fixtures, results and knockouts
-- =============================================================================
--
-- WHY
--   The app gets a Tournaments feature (More tab -> Tournaments, ongoing
--   tournaments on Home). `tournaments` and `tournament_teams` exist but are
--   read-only for clients (docs/DATABASE_SCHEMA.md §7.3), `tournament_teams`
--   requires a team (table tennis entries are one or two players), and there is
--   nowhere to store fixtures and results.
--
-- WHAT
--   1. tournaments: sport check (cricket, football, table_tennis), table tennis
--      format (single / double), cricket overs per innings and players per side,
--      number of teams that qualify for knockouts (0 = league only, 2 = final,
--      4 = semi-finals + final), winner entry, created_by.
--      Status uses the existing tournament_status enum: 'live' while the
--      tournament is running, 'completed' once it is finished (archived).
--   2. tournament_teams ("entries"): team_id becomes optional; new columns
--      name (editable display name, "Team 1" etc. for table tennis),
--      player_ids (table tennis players), seed (order), tie_break_rank (set by
--      an admin when the tie-breakers can't separate teams at the
--      qualification cut-off). Deleting a tournament deletes its entries.
--   3. tournament_matches: one row per fixture (league, semi, final) with the
--      result entered by an admin (runs/wickets/balls for cricket, goals for
--      football, games won for table tennis).
--   4. create_tournament(...) RPC: creates the tournament, its entries and its
--      league fixtures in one transaction. Admins only.
--   5. RLS: everyone can read; only admins (public.is_admin()) can write.
--
-- NOT AFFECTED
--   matches / innings / scorecards (cricket live scoring is still in memory),
--   table_tennis_matches, player_stats, player_match_stats, sport_awards.
--   Tournament results do not change player stats or Champions.
--
-- Needs public.is_admin() (20261123000000) and public.set_updated_at().
-- Status: written 2026-11-23 for review. NOT applied.
-- APPLY: Supabase dashboard -> SQL editor -> paste this file -> Run.
--
-- PRE-CHECKS (read-only)
--   a) Existing tournaments whose sport the new check would reject
--      (expected: 0 rows; otherwise fix or delete them first):
--      select id, name, sport from public.tournaments
--       where sport not in ('cricket', 'football', 'table_tennis');
--   b) Existing policies on the two tables (kept as they are):
--      select tablename, policyname, cmd from pg_policies
--       where tablename in ('tournaments', 'tournament_teams');
--   c) Foreign key names this migration replaces
--      (expected: tournament_teams_tournament_id_fkey):
--      select conname from pg_constraint
--       where conrelid = 'public.tournament_teams'::regclass and contype = 'f';
-- =============================================================================

begin;

-- 1. tournaments --------------------------------------------------------------
alter table public.tournaments
  add column if not exists format text,
  add column if not exists overs_per_innings smallint,
  add column if not exists players_per_side smallint,
  add column if not exists qualifiers smallint not null default 0,
  add column if not exists winner_entry_id uuid,
  add column if not exists created_by uuid default auth.uid();

alter table public.tournaments drop constraint if exists tournaments_sport_check;
alter table public.tournaments
  add constraint tournaments_sport_check check (sport in ('cricket', 'football', 'table_tennis'));

alter table public.tournaments drop constraint if exists tournaments_format_check;
alter table public.tournaments
  add constraint tournaments_format_check check (
    (sport = 'table_tennis' and format in ('single', 'double'))
    or (sport <> 'table_tennis' and format is null)
  ) not valid;

alter table public.tournaments drop constraint if exists tournaments_cricket_settings_check;
alter table public.tournaments
  add constraint tournaments_cricket_settings_check check (
    sport <> 'cricket'
    or (overs_per_innings between 1 and 50 and players_per_side between 2 and 11)
  ) not valid;

alter table public.tournaments drop constraint if exists tournaments_qualifiers_check;
alter table public.tournaments
  add constraint tournaments_qualifiers_check check (qualifiers in (0, 2, 4));

-- 2. tournament_teams (entries) ----------------------------------------------
alter table public.tournament_teams alter column team_id drop not null;

alter table public.tournament_teams
  add column if not exists name text,
  add column if not exists player_ids uuid[] not null default '{}',
  add column if not exists seed smallint,
  add column if not exists tie_break_rank smallint;

update public.tournament_teams tt
   set name = t.name
  from public.teams t
 where tt.team_id = t.id and tt.name is null;

alter table public.tournament_teams drop constraint if exists tournament_teams_has_member;
alter table public.tournament_teams
  add constraint tournament_teams_has_member
  check (team_id is not null or cardinality(player_ids) > 0) not valid;

-- Deleting a tournament deletes its entries.
alter table public.tournament_teams drop constraint if exists tournament_teams_tournament_id_fkey;
alter table public.tournament_teams
  add constraint tournament_teams_tournament_id_fkey
  foreign key (tournament_id) references public.tournaments(id) on delete cascade;

create index if not exists tournament_teams_tournament_idx on public.tournament_teams (tournament_id);

alter table public.tournaments drop constraint if exists tournaments_winner_entry_fkey;
alter table public.tournaments
  add constraint tournaments_winner_entry_fkey
  foreign key (winner_entry_id) references public.tournament_teams(id) on delete set null;

-- 3. tournament_matches ------------------------------------------------------
create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage text not null default 'league' check (stage in ('league', 'semi', 'final')),
  round smallint not null default 1,
  entry_a_id uuid not null references public.tournament_teams(id) on delete cascade,
  entry_b_id uuid not null references public.tournament_teams(id) on delete cascade,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed')),
  -- runs (cricket), goals (football) or games won (table tennis)
  score_a integer check (score_a >= 0),
  score_b integer check (score_b >= 0),
  -- cricket only
  wickets_a smallint check (wickets_a between 0 and 10),
  wickets_b smallint check (wickets_b between 0 and 10),
  balls_a integer check (balls_a >= 0),
  balls_b integer check (balls_b >= 0),
  -- 'A' / 'B' won, 'draw' (tie), 'no_result' (abandoned, cricket)
  outcome text check (outcome in ('A', 'B', 'draw', 'no_result')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_matches_two_entries check (entry_a_id <> entry_b_id),
  constraint tournament_matches_result check (
    (status = 'upcoming' and outcome is null)
    or (status = 'completed' and outcome is not null)
  ),
  -- knockout matches need a winner
  constraint tournament_matches_knockout_winner check (
    stage = 'league' or outcome is null or outcome in ('A', 'B')
  )
);

create index if not exists tournament_matches_tournament_idx
  on public.tournament_matches (tournament_id, stage, round);

drop trigger if exists trg_tournament_matches_updated_at on public.tournament_matches;
create trigger trg_tournament_matches_updated_at
  before update on public.tournament_matches
  for each row execute function public.set_updated_at();

-- 4. create_tournament RPC ---------------------------------------------------
-- p_entries:  [{ "team_id": uuid|null, "name": text, "player_ids": [uuid, ...] }, ...]
-- p_fixtures: [{ "a": <0-based entry index>, "b": <index>, "round": int }, ...]
create or replace function public.create_tournament(
  p_name text,
  p_sport text,
  p_format text,
  p_overs_per_innings smallint,
  p_players_per_side smallint,
  p_qualifiers smallint,
  p_entries jsonb,
  p_fixtures jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_entry_ids uuid[] := '{}';
  v_entry_id uuid;
  e record;
  f record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can create tournaments' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Give the tournament a name';
  end if;
  if jsonb_array_length(coalesce(p_entries, '[]'::jsonb)) < 2 then
    raise exception 'A tournament needs at least 2 teams';
  end if;

  insert into public.tournaments
    (name, sport, format, overs_per_innings, players_per_side, qualifiers, status, start_date)
  values
    (trim(p_name), p_sport,
     case when p_sport = 'table_tennis' then p_format else null end,
     case when p_sport = 'cricket' then p_overs_per_innings else null end,
     case when p_sport = 'cricket' then p_players_per_side else null end,
     coalesce(p_qualifiers, 0), 'live', current_date)
  returning id into v_id;

  for e in
    select value, ordinality from jsonb_array_elements(p_entries) with ordinality
  loop
    insert into public.tournament_teams (tournament_id, team_id, name, player_ids, seed)
    values (
      v_id,
      nullif(e.value->>'team_id', '')::uuid,
      coalesce(nullif(trim(e.value->>'name'), ''), 'Team ' || e.ordinality),
      coalesce(
        (select array_agg(x::uuid) from jsonb_array_elements_text(e.value->'player_ids') as x),
        '{}'
      ),
      e.ordinality
    )
    returning id into v_entry_id;
    v_entry_ids := v_entry_ids || v_entry_id;
  end loop;

  for f in select value from jsonb_array_elements(coalesce(p_fixtures, '[]'::jsonb))
  loop
    insert into public.tournament_matches (tournament_id, stage, round, entry_a_id, entry_b_id)
    values (
      v_id, 'league', coalesce((f.value->>'round')::smallint, 1),
      v_entry_ids[(f.value->>'a')::int + 1],
      v_entry_ids[(f.value->>'b')::int + 1]
    );
  end loop;

  return v_id;
end;
$$;

revoke all on function public.create_tournament(text, text, text, smallint, smallint, smallint, jsonb, jsonb)
  from public, anon;
grant execute on function public.create_tournament(text, text, text, smallint, smallint, smallint, jsonb, jsonb)
  to authenticated;

-- 5. RLS ---------------------------------------------------------------------
alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournament_matches enable row level security;

grant select on public.tournaments, public.tournament_teams, public.tournament_matches to anon, authenticated;
grant insert, update, delete on public.tournaments, public.tournament_teams, public.tournament_matches to authenticated;

drop policy if exists "tournaments_read" on public.tournaments;
create policy "tournaments_read" on public.tournaments
  for select to anon, authenticated using (true);
drop policy if exists "tournaments_admin_write" on public.tournaments;
create policy "tournaments_admin_write" on public.tournaments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tournament_teams_read" on public.tournament_teams;
create policy "tournament_teams_read" on public.tournament_teams
  for select to anon, authenticated using (true);
drop policy if exists "tournament_teams_admin_write" on public.tournament_teams;
create policy "tournament_teams_admin_write" on public.tournament_teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tournament_matches_read" on public.tournament_matches;
create policy "tournament_matches_read" on public.tournament_matches
  for select to anon, authenticated using (true);
drop policy if exists "tournament_matches_admin_write" on public.tournament_matches;
create policy "tournament_matches_admin_write" on public.tournament_matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------
-- a) As an admin, create a 3-team football tournament, then roll back:
--      begin;
--      set local role authenticated;
--      select set_config('request.jwt.claims',
--        json_build_object('sub', '<admin-uuid>', 'role', 'authenticated')::text, true);
--      select public.create_tournament('Test cup', 'football', null, null, null, 0::smallint,
--        jsonb_build_array(
--          jsonb_build_object('team_id', (select id from public.teams where sport = 'football' limit 1)),
--          jsonb_build_object('team_id', (select id from public.teams where sport = 'football' offset 1 limit 1)),
--          jsonb_build_object('team_id', (select id from public.teams where sport = 'football' offset 2 limit 1))),
--        '[{"a":0,"b":1,"round":1},{"a":0,"b":2,"round":2},{"a":1,"b":2,"round":3}]'::jsonb);
--      select count(*) from public.tournament_matches;   -- 3 more than before
--      rollback;
--
-- b) As a player, the same call fails with 'Only admins can create tournaments',
--    and `update public.tournament_matches set score_a = 1` changes 0 rows.
--
-- -----------------------------------------------------------------------------
-- ROLLBACK (loses all fixtures and results, and table tennis entries)
-- -----------------------------------------------------------------------------
--   begin;
--   drop function if exists public.create_tournament(text, text, text, smallint, smallint, smallint, jsonb, jsonb);
--   drop table if exists public.tournament_matches;
--   drop policy if exists "tournaments_read" on public.tournaments;
--   drop policy if exists "tournaments_admin_write" on public.tournaments;
--   drop policy if exists "tournament_teams_read" on public.tournament_teams;
--   drop policy if exists "tournament_teams_admin_write" on public.tournament_teams;
--   alter table public.tournaments drop constraint if exists tournaments_winner_entry_fkey;
--   delete from public.tournament_teams where team_id is null;
--   alter table public.tournament_teams drop constraint if exists tournament_teams_has_member;
--   alter table public.tournament_teams
--     drop column if exists name, drop column if exists player_ids,
--     drop column if exists seed, drop column if exists tie_break_rank;
--   alter table public.tournament_teams alter column team_id set not null;
--   alter table public.tournaments
--     drop constraint if exists tournaments_sport_check,
--     drop constraint if exists tournaments_format_check,
--     drop constraint if exists tournaments_cricket_settings_check,
--     drop constraint if exists tournaments_qualifiers_check,
--     drop column if exists format, drop column if exists overs_per_innings,
--     drop column if exists players_per_side, drop column if exists qualifiers,
--     drop column if exists winner_entry_id, drop column if exists created_by;
--   commit;
--   -- RLS stays enabled on tournaments / tournament_teams; disable it only if
--   -- it was off before (pre-check b).
