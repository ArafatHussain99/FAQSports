-- =============================================================================
-- Table tennis awards: separate singles and doubles champions
-- =============================================================================
-- Problem:
--   sport_awards (20261124000000) holds one champion and one runner-up per
--   sport, each a single team or player. Table tennis has singles and doubles,
--   and a doubles winner is a pair of players.
--
-- Fix:
--   1. Add `category` to sport_awards and sport_award_recipients:
--        'main'    cricket and football (one competition)
--        'singles' table tennis singles
--        'doubles' table tennis doubles
--      Existing table tennis awards become 'singles'. The key becomes
--      (sport, category, place).
--   2. New set_sport_award(sport, category, place, team_id, player_ids[]):
--      singles takes exactly 1 player, doubles exactly 2. The pair is stored as
--      recipients; sport_awards.player_id keeps the first player.
--   3. New clear_sport_award(sport, category, place).
--   4. The old 4-argument set_sport_award and 2-argument clear_sport_award
--      keep working (table tennis -> 'singles'), so the app version before
--      this change doesn't break.
--
-- Not affected: player_match_stats, team archiving, who can read awards,
-- admin-only writes (still checked with public.is_admin()).
--
-- Status: written 2026-11-26 for review. NOT applied.
-- Needs 20261124000000 applied first.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PRE-CHECKS (read-only)
-- -----------------------------------------------------------------------------
-- a) Current awards (table tennis rows will become 'singles').
--      select sport, place, team_id, player_id from public.sport_awards order by sport, place;
--
-- b) Constraint names this migration replaces (expected: the two pkeys and one fkey).
--      select conname, conrelid::regclass from pg_constraint
--      where conrelid in ('public.sport_awards'::regclass, 'public.sport_award_recipients'::regclass)
--        and contype in ('p', 'f');


-- -----------------------------------------------------------------------------
-- MIGRATION
-- -----------------------------------------------------------------------------
begin;

-- 1. Category columns
alter table public.sport_awards
  add column if not exists category text not null default 'main';
alter table public.sport_award_recipients
  add column if not exists category text not null default 'main';

update public.sport_awards set category = 'singles' where sport = 'table_tennis' and category = 'main';
update public.sport_award_recipients set category = 'singles' where sport = 'table_tennis' and category = 'main';

alter table public.sport_awards drop constraint if exists sport_awards_category_check;
alter table public.sport_awards add constraint sport_awards_category_check check (
  (sport = 'table_tennis' and category in ('singles', 'doubles'))
  or (sport <> 'table_tennis' and category = 'main')
);

-- 2. Re-key on (sport, category, place). Drop the recipient foreign key first.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.sport_award_recipients'::regclass and contype = 'f'
      and confrelid = 'public.sport_awards'::regclass
  loop
    execute format('alter table public.sport_award_recipients drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.sport_award_recipients drop constraint if exists sport_award_recipients_pkey;
alter table public.sport_awards drop constraint if exists sport_awards_pkey;

alter table public.sport_awards add primary key (sport, category, place);
alter table public.sport_award_recipients add primary key (sport, category, place, player_id);
alter table public.sport_award_recipients
  add constraint sport_award_recipients_award_fkey
  foreign key (sport, category, place)
  references public.sport_awards (sport, category, place) on delete cascade;

-- 3. Set an award (category-aware)
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
  else
    -- A team award recognises the squad at award time.
    insert into public.sport_award_recipients (sport, category, place, player_id)
    select p_sport, p_category, p_place, id from public.players where team_id = p_team_id;
  end if;
end;
$$;

create or replace function public.clear_sport_award(p_sport text, p_category text, p_place smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can clear awards' using errcode = '42501';
  end if;
  delete from public.sport_awards where sport = p_sport and category = p_category and place = p_place;
end;
$$;

-- 4. Old signatures keep working (table tennis = singles)
create or replace function public.set_sport_award(p_sport text, p_place smallint, p_team_id uuid, p_player_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select public.set_sport_award(
    p_sport,
    case when p_sport = 'table_tennis' then 'singles' else 'main' end,
    p_place,
    p_team_id,
    case when p_player_id is null then null else array[p_player_id] end
  );
$$;

create or replace function public.clear_sport_award(p_sport text, p_place smallint)
returns void
language sql
security definer
set search_path = public
as $$
  select public.clear_sport_award(
    p_sport, case when p_sport = 'table_tennis' then 'singles' else 'main' end, p_place
  );
$$;

revoke all on function public.set_sport_award(text, text, smallint, uuid, uuid[]) from public, anon;
revoke all on function public.clear_sport_award(text, text, smallint) from public, anon;
grant execute on function public.set_sport_award(text, text, smallint, uuid, uuid[]) to authenticated;
grant execute on function public.clear_sport_award(text, text, smallint) to authenticated;

commit;


-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------
-- a) Key and category (expected: sport_awards_pkey on (sport, category, place)).
--      select conname, pg_get_constraintdef(oid) from pg_constraint
--      where conrelid = 'public.sport_awards'::regclass and contype = 'p';
--
-- b) As an admin, set a doubles pair and read it back, then roll back:
--      begin;
--      set local role authenticated;
--      select set_config('request.jwt.claims',
--        json_build_object('sub', '<admin-uuid>', 'role', 'authenticated')::text, true);
--      select public.set_sport_award('table_tennis', 'doubles', 1::smallint, null,
--        array['<player-1-uuid>', '<player-2-uuid>']::uuid[]);
--      select * from public.sport_award_recipients where sport = 'table_tennis';   -- 2 rows, doubles
--      rollback;


-- -----------------------------------------------------------------------------
-- ROLLBACK (doubles awards are lost)
-- -----------------------------------------------------------------------------
--   begin;
--   delete from public.sport_awards where category = 'doubles';
--   drop function if exists public.set_sport_award(text, text, smallint, uuid, uuid[]);
--   drop function if exists public.clear_sport_award(text, text, smallint);
--   alter table public.sport_award_recipients drop constraint sport_award_recipients_award_fkey;
--   alter table public.sport_award_recipients drop constraint sport_award_recipients_pkey;
--   alter table public.sport_awards drop constraint sport_awards_pkey;
--   alter table public.sport_awards drop constraint sport_awards_category_check;
--   alter table public.sport_awards add primary key (sport, place);
--   alter table public.sport_award_recipients add primary key (sport, place, player_id);
--   alter table public.sport_award_recipients add foreign key (sport, place)
--     references public.sport_awards (sport, place) on delete cascade;
--   alter table public.sport_awards drop column category;
--   alter table public.sport_award_recipients drop column category;
--   commit;
--   -- Finally re-run the set_sport_award(text, smallint, uuid, uuid) and
--   -- clear_sport_award(text, smallint) definitions from 20261124000000.
