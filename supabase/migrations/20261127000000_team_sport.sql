-- =============================================================================
-- Separate cricket and football teams
-- =============================================================================
--
-- WHY
--   Admins want different teams for cricket and football, and a player can be
--   in one cricket team AND one football team at the same time
--   (docs/REQUIREMENTS.md §7, decided 2026-11-23).
--
-- WHAT
--   1. teams.sport ('cricket' | 'football'), default 'cricket'. Every existing
--      team becomes a cricket team.
--   2. Team names are unique per sport instead of globally, so "Tigers" can
--      exist once for cricket and once for football.
--   3. players.football_team_id (FK teams). players.team_id stays and now
--      means the CRICKET team. A trigger rejects a team_id that isn't a
--      cricket team and a football_team_id that isn't a football team.
--   4. A team's sport can't change while players are assigned to it
--      (it would break the rule in 3).
--   5. archive_team() unassigns both columns.
--   6. set_sport_award() checks the team belongs to the award's sport and
--      snapshots the squad from the matching column.
--
-- NOT AFFECTED
--   player_match_stats, matches, table tennis, RLS policies (the existing
--   admin UPDATE policy on players covers the new column).
--
-- Status: written 2026-11-23 for review. NOT applied.
-- APPLY: Supabase dashboard -> SQL editor -> paste this file -> Run.
--
-- PRE-CHECKS (read-only)
--   a) Name constraint to drop (expected: teams_name_key):
--      select conname from pg_constraint
--       where conrelid = 'public.teams'::regclass and contype = 'u';
--
-- CHECKS (after applying)
--   a) select sport, count(*) from public.teams group by sport;      -- all 'cricket' at first
--   b) select column_name from information_schema.columns
--       where table_name = 'players' and column_name = 'football_team_id';   -- 1 row
--   c) Assigning a cricket team as a football team fails:
--      begin;
--      update public.players set football_team_id =
--        (select id from public.teams where sport = 'cricket' limit 1)
--       where id = (select id from public.players limit 1);
--      -- ERROR: football_team_id must be a football team
--      rollback;
--
-- ROLLBACK (loses football team assignments; football teams stay as rows)
--   begin;
--   drop trigger if exists players_team_sport_check on public.players;
--   drop trigger if exists teams_sport_change_check on public.teams;
--   drop function if exists public.check_player_team_sport(), public.check_team_sport_change();
--   alter table public.players drop column if exists football_team_id;
--   alter table public.teams drop constraint if exists teams_sport_name_key;
--   alter table public.teams add constraint teams_name_key unique (name);  -- fails if names now repeat
--   alter table public.teams drop column if exists sport;
--   -- then re-run section 1 of 20261124000000 (archive_team) and
--   -- section 3 of 20261126000000 (set_sport_award)
--   commit;
-- =============================================================================

begin;

-- 1. teams.sport -------------------------------------------------------------
alter table public.teams
  add column if not exists sport text not null default 'cricket';

alter table public.teams drop constraint if exists teams_sport_check;
alter table public.teams
  add constraint teams_sport_check check (sport in ('cricket', 'football'));

-- 2. Unique name per sport ---------------------------------------------------
alter table public.teams drop constraint if exists teams_name_key;
alter table public.teams drop constraint if exists teams_sport_name_key;
alter table public.teams add constraint teams_sport_name_key unique (sport, name);

-- 3. players.football_team_id ------------------------------------------------
alter table public.players
  add column if not exists football_team_id uuid references public.teams(id);

create index if not exists players_football_team_id_idx on public.players (football_team_id);

create or replace function public.check_player_team_sport()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.team_id is not null
     and not exists (select 1 from public.teams where id = new.team_id and sport = 'cricket') then
    raise exception 'team_id must be a cricket team' using errcode = '23514';
  end if;
  if new.football_team_id is not null
     and not exists (select 1 from public.teams where id = new.football_team_id and sport = 'football') then
    raise exception 'football_team_id must be a football team' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists players_team_sport_check on public.players;
create trigger players_team_sport_check
  before insert or update of team_id, football_team_id on public.players
  for each row execute function public.check_player_team_sport();

-- 4. Don't change a team's sport while it has players -----------------------
create or replace function public.check_team_sport_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sport is distinct from old.sport
     and exists (select 1 from public.players
                  where team_id = new.id or football_team_id = new.id) then
    raise exception 'Remove the players from % before changing its sport', old.name
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists teams_sport_change_check on public.teams;
create trigger teams_sport_change_check
  before update of sport on public.teams
  for each row execute function public.check_team_sport_change();

-- 5. archive_team unassigns both sports -------------------------------------
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
  update public.players set football_team_id = null, updated_at = now()
   where football_team_id = p_team_id;
end;
$$;

-- 6. set_sport_award: team must match the sport -----------------------------
create or replace function public.set_sport_award(
  p_sport text, p_category text, p_place smallint, p_team_id uuid, p_player_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ids uuid[] := coalesce((select array_agg(distinct x) from unnest(p_player_ids) as x where x is not null), '{}');
begin
  if not public.is_admin() then
    raise exception 'Only admins can set awards' using errcode = '42501';
  end if;

  if p_sport = 'table_tennis' then
    if p_category = 'singles' and cardinality(ids) <> 1 then
      raise exception 'Choose one player for a singles award';
    elsif p_category = 'doubles' and cardinality(ids) <> 2 then
      raise exception 'Choose two different players for a doubles award';
    elsif p_category not in ('singles', 'doubles') then
      raise exception 'Table tennis awards are singles or doubles';
    end if;
  else
    if p_team_id is null then
      raise exception 'Choose a team';
    end if;
    if not exists (select 1 from public.teams where id = p_team_id and sport = p_sport) then
      raise exception 'Choose a % team', p_sport;
    end if;
    p_category := 'main';
  end if;

  insert into public.sport_awards (sport, category, place, team_id, player_id, awarded_at)
  values (p_sport, p_category, p_place, case when p_sport = 'table_tennis' then null else p_team_id end,
          case when p_sport = 'table_tennis' then ids[1] else null end, now())
  on conflict (sport, category, place) do update
    set team_id = excluded.team_id, player_id = excluded.player_id, awarded_at = now();

  delete from public.sport_award_recipients
   where sport = p_sport and category = p_category and place = p_place;

  if p_sport = 'table_tennis' then
    insert into public.sport_award_recipients (sport, category, place, player_id)
    select p_sport, p_category, p_place, x from unnest(ids) as x;
  elsif p_sport = 'football' then
    -- A team award recognises the squad at award time.
    insert into public.sport_award_recipients (sport, category, place, player_id)
    select p_sport, p_category, p_place, id from public.players where football_team_id = p_team_id;
  else
    insert into public.sport_award_recipients (sport, category, place, player_id)
    select p_sport, p_category, p_place, id from public.players where team_id = p_team_id;
  end if;
end;
$$;

commit;
