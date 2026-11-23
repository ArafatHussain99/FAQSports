-- =============================================================================
-- Team archiving, per-match player stats, table tennis stats, sport awards
-- =============================================================================
--
-- WHY
--   1. Teams can't be deleted any more, only archived and restored. Archiving a
--      team unassigns its players (players.team_id = null) but keeps the team
--      row and all its history, so an archived team can still be opened.
--   2. Every finished match writes one row per player to player_match_stats,
--      tagged with the team they played for. That row stays with the team even
--      after the player moves, and drives "teams played for" on the profile.
--      An insert trigger rolls each row up into player_stats and updates
--      records (highest score, best bowling) at match end.
--   3. player_stats gets table tennis columns (tt_matches, tt_wins, tt_losses)
--      and the cricket counters needed for averages (cricket_innings,
--      cricket_dismissals, balls_bowled, runs_conceded). `wins` stays the
--      football win count.
--   4. Admins set the current champion and runner-up per sport. The players
--      recognised are snapshotted at award time (sport_award_recipients), so
--      they keep the award if they later move teams.
--
-- WHO CAN WRITE
--   Everything is written through SECURITY DEFINER functions that check
--   public.is_admin() (from 20261119000100). The new tables are readable by
--   everyone and have no direct write policies.
--
-- IDEMPOTENT
--   record_match_stats() ignores a (sport, match_id, player_id) it has already
--   recorded, so re-sending a match never double counts. For table tennis a
--   re-sent result with a different winner updates won/lost and the trigger
--   moves the win/loss between columns.
--
-- APPLY: Supabase dashboard -> SQL editor -> paste this file -> Run.
--
-- CHECKS (run after applying)
--   a) select column_name from information_schema.columns
--        where table_name = 'teams' and column_name = 'archived_at';            -- 1 row
--   b) select column_name from information_schema.columns
--        where table_name = 'player_stats' and column_name like 'tt_%';         -- 3 rows
--   c) select proname from pg_proc where proname in
--        ('archive_team','restore_team','record_match_stats',
--         'set_sport_award','clear_sport_award');                               -- 5 rows
--
-- ROLLBACK (destroys recorded match stats and awards)
--   drop table if exists public.sport_award_recipients, public.sport_awards,
--     public.player_match_stats cascade;
--   drop function if exists public.archive_team(uuid), public.restore_team(uuid),
--     public.record_match_stats(text, text, jsonb),
--     public.set_sport_award(text, smallint, uuid, uuid),
--     public.clear_sport_award(text, smallint),
--     public.apply_player_match_stats();
--   alter table public.teams drop column if exists archived_at;
--   alter table public.player_stats drop column if exists tt_matches,
--     drop column if exists tt_wins, drop column if exists tt_losses,
--     drop column if exists cricket_innings, drop column if exists cricket_dismissals,
--     drop column if exists balls_bowled, drop column if exists runs_conceded;
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Team archiving
-- -----------------------------------------------------------------------------
alter table public.teams add column if not exists archived_at timestamptz;

create or replace function public.archive_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can archive teams' using errcode = '42501';
  end if;

  update public.teams
     set archived_at = coalesce(archived_at, now()), updated_at = now()
   where id = p_team_id;
  if not found then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  -- Players stay; they just no longer belong to the archived team.
  update public.players set team_id = null, updated_at = now()
   where team_id = p_team_id;
end;
$$;

create or replace function public.restore_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can restore teams' using errcode = '42501';
  end if;

  update public.teams set archived_at = null, updated_at = now()
   where id = p_team_id;
  if not found then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. player_stats: table tennis + cricket counters
-- -----------------------------------------------------------------------------
alter table public.player_stats
  add column if not exists tt_matches integer not null default 0,
  add column if not exists tt_wins integer not null default 0,
  add column if not exists tt_losses integer not null default 0,
  add column if not exists cricket_innings integer not null default 0,
  add column if not exists cricket_dismissals integer not null default 0,
  add column if not exists balls_bowled integer not null default 0,
  add column if not exists runs_conceded integer not null default 0;

-- -----------------------------------------------------------------------------
-- 3. One row per player per finished match
-- -----------------------------------------------------------------------------
create table if not exists public.player_match_stats (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('cricket', 'football', 'table_tennis')),
  match_id text not null,              -- cricket ids are app-generated, TT ids are uuids
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  team_name text,                      -- snapshot, readable even if the team changes
  played_at timestamptz not null default now(),
  -- cricket
  runs integer not null default 0,
  balls integer not null default 0,
  fours integer not null default 0,
  sixes integer not null default 0,
  batted boolean not null default false,
  dismissed boolean not null default false,
  wickets integer not null default 0,
  balls_bowled integer not null default 0,
  runs_conceded integer not null default 0,
  catches integer not null default 0,
  run_outs integer not null default 0,
  stumpings integer not null default 0,
  -- football
  goals integer not null default 0,
  assists integer not null default 0,
  -- result for the player's side (football and table tennis)
  won boolean,
  created_at timestamptz not null default now(),
  unique (sport, match_id, player_id)
);

create index if not exists player_match_stats_player_idx on public.player_match_stats (player_id);
create index if not exists player_match_stats_team_idx on public.player_match_stats (team_id);

alter table public.player_match_stats enable row level security;
drop policy if exists "Read player match stats" on public.player_match_stats;
create policy "Read player match stats"
  on public.player_match_stats for select to anon, authenticated using (true);

-- Roll a match line up into player_stats and update records.
create or replace function public.apply_player_match_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  best_w integer;
  best_r integer;
begin
  insert into public.player_stats (player_id) values (new.player_id)
  on conflict (player_id) do nothing;

  if tg_op = 'UPDATE' then
    -- Only a table tennis result can change after the fact.
    if new.sport = 'table_tennis' and old.won is distinct from new.won then
      update public.player_stats set
        tt_wins = tt_wins + (coalesce(new.won, false))::int - (coalesce(old.won, false))::int,
        tt_losses = tt_losses + (new.won is false)::int - (old.won is false)::int,
        updated_at = now()
      where player_id = new.player_id;
    end if;
    return new;
  end if;

  if new.sport = 'cricket' then
    select coalesce(nullif(best_bowling_wickets, '')::integer, 0),
           coalesce(nullif(best_bowling_runs, '')::integer, 0)
      into best_w, best_r
      from public.player_stats where player_id = new.player_id;

    update public.player_stats set
      matches = matches + 1,
      runs = runs + new.runs,
      balls = balls + new.balls,
      wickets = wickets + new.wickets,
      catches = catches + new.catches,
      run_outs = run_outs + new.run_outs,
      stumpings = stumpings + new.stumpings,
      cricket_innings = cricket_innings + new.batted::int,
      cricket_dismissals = cricket_dismissals + new.dismissed::int,
      balls_bowled = balls_bowled + new.balls_bowled,
      runs_conceded = runs_conceded + new.runs_conceded,
      fifties = fifties + (new.runs >= 50 and new.runs < 100)::int,
      centuries = centuries + (new.runs >= 100)::int,
      -- records are only ever raised, at match end
      highest_score = greatest(highest_score, new.runs),
      best_bowling_wickets = case
        when new.wickets > 0 and (new.wickets > best_w or (new.wickets = best_w and new.runs_conceded < best_r))
        then new.wickets::text else best_bowling_wickets end,
      best_bowling_runs = case
        when new.wickets > 0 and (new.wickets > best_w or (new.wickets = best_w and new.runs_conceded < best_r))
        then new.runs_conceded::text else best_bowling_runs end,
      updated_at = now()
    where player_id = new.player_id;

    -- Recompute rates from the running totals.
    update public.player_stats set
      batting_average = case when cricket_dismissals > 0
        then round(runs::numeric / cricket_dismissals, 2) else runs end,
      strike_rate = case when balls > 0 then round(runs::numeric * 100 / balls, 2) else 0 end,
      economy_rate = case when balls_bowled > 0
        then round(runs_conceded::numeric * 6 / balls_bowled, 2) else 0 end
    where player_id = new.player_id;

  elsif new.sport = 'football' then
    update public.player_stats set
      goals = goals + new.goals,
      assists = assists + new.assists,
      wins = wins + coalesce(new.won, false)::int,
      updated_at = now()
    where player_id = new.player_id;

  elsif new.sport = 'table_tennis' then
    update public.player_stats set
      tt_matches = tt_matches + 1,
      tt_wins = tt_wins + coalesce(new.won, false)::int,
      tt_losses = tt_losses + (new.won is false)::int,
      updated_at = now()
    where player_id = new.player_id;
  end if;

  return new;
end;
$$;

drop trigger if exists player_match_stats_apply on public.player_match_stats;
create trigger player_match_stats_apply
  after insert or update on public.player_match_stats
  for each row execute function public.apply_player_match_stats();

-- Record a finished match. p_lines is a JSON array of objects with
-- player_id, team_id, and any of the stat columns above.
create or replace function public.record_match_stats(p_sport text, p_match_id text, p_lines jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  line jsonb;
  written integer := 0;
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can record match stats' using errcode = '42501';
  end if;
  if p_sport not in ('cricket', 'football', 'table_tennis') then
    raise exception 'Unknown sport %', p_sport;
  end if;

  for line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    insert into public.player_match_stats as pms (
      sport, match_id, player_id, team_id, team_name,
      runs, balls, fours, sixes, batted, dismissed, wickets, balls_bowled,
      runs_conceded, catches, run_outs, stumpings, goals, assists, won
    ) values (
      p_sport, p_match_id, (line->>'player_id')::uuid, nullif(line->>'team_id', '')::uuid,
      (select name from public.teams where id = nullif(line->>'team_id', '')::uuid),
      coalesce((line->>'runs')::int, 0), coalesce((line->>'balls')::int, 0),
      coalesce((line->>'fours')::int, 0), coalesce((line->>'sixes')::int, 0),
      coalesce((line->>'batted')::boolean, false), coalesce((line->>'dismissed')::boolean, false),
      coalesce((line->>'wickets')::int, 0), coalesce((line->>'balls_bowled')::int, 0),
      coalesce((line->>'runs_conceded')::int, 0), coalesce((line->>'catches')::int, 0),
      coalesce((line->>'run_outs')::int, 0), coalesce((line->>'stumpings')::int, 0),
      coalesce((line->>'goals')::int, 0), coalesce((line->>'assists')::int, 0),
      (line->>'won')::boolean
    )
    on conflict (sport, match_id, player_id) do update
      set won = excluded.won
      where pms.sport = 'table_tennis' and pms.won is distinct from excluded.won;
    get diagnostics n = row_count;
    written := written + n;
  end loop;

  return written;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Current champion and runner-up per sport
-- -----------------------------------------------------------------------------
create table if not exists public.sport_awards (
  sport text not null check (sport in ('cricket', 'football', 'table_tennis')),
  place smallint not null check (place in (1, 2)),   -- 1 = champion, 2 = runner-up
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (sport, place),
  check (team_id is not null or player_id is not null)
);

create table if not exists public.sport_award_recipients (
  sport text not null,
  place smallint not null,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (sport, place, player_id),
  foreign key (sport, place) references public.sport_awards(sport, place) on delete cascade
);

alter table public.sport_awards enable row level security;
alter table public.sport_award_recipients enable row level security;
drop policy if exists "Read sport awards" on public.sport_awards;
create policy "Read sport awards" on public.sport_awards for select to anon, authenticated using (true);
drop policy if exists "Read sport award recipients" on public.sport_award_recipients;
create policy "Read sport award recipients" on public.sport_award_recipients for select to anon, authenticated using (true);

-- Set the award to a team (cricket, football) or a player (table tennis).
-- A team award goes to the players on the team right now.
create or replace function public.set_sport_award(p_sport text, p_place smallint, p_team_id uuid, p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can set awards' using errcode = '42501';
  end if;
  if p_team_id is null and p_player_id is null then
    raise exception 'Choose a team or a player';
  end if;

  insert into public.sport_awards (sport, place, team_id, player_id, awarded_at)
  values (p_sport, p_place, p_team_id, p_player_id, now())
  on conflict (sport, place) do update
    set team_id = excluded.team_id, player_id = excluded.player_id, awarded_at = now();

  delete from public.sport_award_recipients where sport = p_sport and place = p_place;

  if p_player_id is not null then
    insert into public.sport_award_recipients (sport, place, player_id)
    values (p_sport, p_place, p_player_id);
  else
    insert into public.sport_award_recipients (sport, place, player_id)
    select p_sport, p_place, id from public.players where team_id = p_team_id;
  end if;
end;
$$;

create or replace function public.clear_sport_award(p_sport text, p_place smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can clear awards' using errcode = '42501';
  end if;
  delete from public.sport_awards where sport = p_sport and place = p_place;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. Grants
-- -----------------------------------------------------------------------------
revoke all on function public.archive_team(uuid) from public, anon;
revoke all on function public.restore_team(uuid) from public, anon;
revoke all on function public.record_match_stats(text, text, jsonb) from public, anon;
revoke all on function public.set_sport_award(text, smallint, uuid, uuid) from public, anon;
revoke all on function public.clear_sport_award(text, smallint) from public, anon;
revoke all on function public.apply_player_match_stats() from public, anon, authenticated;
grant execute on function public.archive_team(uuid) to authenticated;
grant execute on function public.restore_team(uuid) to authenticated;
grant execute on function public.record_match_stats(text, text, jsonb) to authenticated;
grant execute on function public.set_sport_award(text, smallint, uuid, uuid) to authenticated;
grant execute on function public.clear_sport_award(text, smallint) to authenticated;

grant select on public.player_match_stats, public.sport_awards, public.sport_award_recipients
  to anon, authenticated;

commit;
