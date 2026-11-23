-- Supabase `public` schema for FAQ Sports, exported from the Supabase dashboard
-- and supplied by the project owner on 2026-11-19. Documented in docs/DATABASE_SCHEMA.md.
--
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- The export does not include enum values (shown as USER-DEFINED), RLS policies,
-- triggers, indexes or ON DELETE rules.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  favorite_team_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  role text,
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_favorite_team_id_fkey FOREIGN KEY (favorite_team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.grounds (
  name text NOT NULL UNIQUE,
  location text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT grounds_pkey PRIMARY KEY (id)
);
CREATE TABLE public.teams (
  name text NOT NULL UNIQUE,
  short_name text,
  color text CHECK (color IS NULL OR color ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'::text),
  logo_url text,
  captain_player_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_captain_player_id_fkey FOREIGN KEY (captain_player_id) REFERENCES public.players(id)
);
CREATE TABLE public.players (
  team_id uuid,
  position USER-DEFINED,
  batting_style text,
  bowling_style text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  CONSTRAINT players_pkey PRIMARY KEY (id),
  CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.player_stats (
  player_id uuid NOT NULL UNIQUE,
  best_bowling_wickets text,
  matches integer NOT NULL DEFAULT 0,
  runs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  wickets integer NOT NULL DEFAULT 0,
  catches integer NOT NULL DEFAULT 0,
  run_outs integer NOT NULL DEFAULT 0,
  stumpings integer NOT NULL DEFAULT 0,
  highest_score integer NOT NULL DEFAULT 0,
  fifties integer NOT NULL DEFAULT 0,
  centuries integer NOT NULL DEFAULT 0,
  batting_average numeric NOT NULL DEFAULT 0,
  strike_rate numeric NOT NULL DEFAULT 0,
  economy_rate numeric NOT NULL DEFAULT 0,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  best_bowling_runs text,
  CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.player_ratings (
  player_id uuid NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  batting integer NOT NULL DEFAULT 0,
  bowling integer NOT NULL DEFAULT 0,
  fielding integer NOT NULL DEFAULT 0,
  overall integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT player_ratings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.tournaments (
  name text NOT NULL,
  sport text NOT NULL,
  start_date date,
  end_date date,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status USER-DEFINED NOT NULL DEFAULT 'upcoming'::tournament_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tournaments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tournament_teams (
  tournament_id uuid NOT NULL,
  team_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tournament_teams_pkey PRIMARY KEY (id),
  CONSTRAINT tournament_teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id),
  CONSTRAINT tournament_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.matches (
  tournament_id uuid,
  total_overs integer CHECK (total_overs IS NULL OR total_overs > 0),
  ground_id uuid,
  team_a_id uuid NOT NULL,
  team_b_id uuid NOT NULL,
  toss_winner_team_id uuid,
  toss_decision USER-DEFINED,
  winner_team_id uuid,
  result_text text,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sport text NOT NULL DEFAULT 'cricket'::text,
  status USER-DEFINED NOT NULL DEFAULT 'upcoming'::match_status,
  match_type USER-DEFINED NOT NULL DEFAULT 'short'::match_type,
  current_innings integer NOT NULL DEFAULT 1 CHECK (current_innings > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id),
  CONSTRAINT matches_ground_id_fkey FOREIGN KEY (ground_id) REFERENCES public.grounds(id),
  CONSTRAINT matches_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id),
  CONSTRAINT matches_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id),
  CONSTRAINT matches_toss_winner_team_id_fkey FOREIGN KEY (toss_winner_team_id) REFERENCES public.teams(id),
  CONSTRAINT matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.match_squads (
  match_id uuid NOT NULL,
  team_id uuid NOT NULL,
  player_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_playing_xi boolean NOT NULL DEFAULT true,
  is_substitute boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT match_squads_pkey PRIMARY KEY (id),
  CONSTRAINT match_squads_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT match_squads_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT match_squads_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.innings (
  match_id uuid NOT NULL,
  innings_number integer NOT NULL,
  batting_team_id uuid NOT NULL,
  bowling_team_id uuid NOT NULL,
  current_striker_player_id uuid,
  current_non_striker_player_id uuid,
  current_bowler_player_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  runs integer NOT NULL DEFAULT 0,
  wickets integer NOT NULL DEFAULT 0,
  overs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT innings_pkey PRIMARY KEY (id),
  CONSTRAINT innings_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT innings_batting_team_id_fkey FOREIGN KEY (batting_team_id) REFERENCES public.teams(id),
  CONSTRAINT innings_bowling_team_id_fkey FOREIGN KEY (bowling_team_id) REFERENCES public.teams(id),
  CONSTRAINT innings_current_striker_player_id_fkey FOREIGN KEY (current_striker_player_id) REFERENCES public.players(id),
  CONSTRAINT innings_current_non_striker_player_id_fkey FOREIGN KEY (current_non_striker_player_id) REFERENCES public.players(id),
  CONSTRAINT innings_current_bowler_player_id_fkey FOREIGN KEY (current_bowler_player_id) REFERENCES public.players(id)
);
CREATE TABLE public.innings_extras (
  innings_id uuid NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wides integer NOT NULL DEFAULT 0,
  no_balls integer NOT NULL DEFAULT 0,
  byes integer NOT NULL DEFAULT 0,
  leg_byes integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT innings_extras_pkey PRIMARY KEY (id),
  CONSTRAINT innings_extras_innings_id_fkey FOREIGN KEY (innings_id) REFERENCES public.innings(id)
);
CREATE TABLE public.batting_scorecards (
  innings_id uuid NOT NULL,
  player_id uuid NOT NULL,
  batting_order integer,
  dismissal_type USER-DEFINED,
  dismissed_by_player_id uuid,
  caught_by_player_id uuid,
  runout_by_player_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  runs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  fours integer NOT NULL DEFAULT 0,
  sixes integer NOT NULL DEFAULT 0,
  strike_rate numeric NOT NULL DEFAULT 0,
  is_out boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT batting_scorecards_pkey PRIMARY KEY (id),
  CONSTRAINT batting_scorecards_innings_id_fkey FOREIGN KEY (innings_id) REFERENCES public.innings(id),
  CONSTRAINT batting_scorecards_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id),
  CONSTRAINT batting_scorecards_dismissed_by_player_id_fkey FOREIGN KEY (dismissed_by_player_id) REFERENCES public.players(id),
  CONSTRAINT batting_scorecards_caught_by_player_id_fkey FOREIGN KEY (caught_by_player_id) REFERENCES public.players(id),
  CONSTRAINT batting_scorecards_runout_by_player_id_fkey FOREIGN KEY (runout_by_player_id) REFERENCES public.players(id)
);
CREATE TABLE public.bowling_scorecards (
  innings_id uuid NOT NULL,
  player_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  overs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  maidens integer NOT NULL DEFAULT 0,
  runs integer NOT NULL DEFAULT 0,
  wickets integer NOT NULL DEFAULT 0,
  economy numeric NOT NULL DEFAULT 0,
  wides integer NOT NULL DEFAULT 0,
  no_balls integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bowling_scorecards_pkey PRIMARY KEY (id),
  CONSTRAINT bowling_scorecards_innings_id_fkey FOREIGN KEY (innings_id) REFERENCES public.innings(id),
  CONSTRAINT bowling_scorecards_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.fall_of_wickets (
  innings_id uuid NOT NULL,
  player_id uuid NOT NULL,
  runs_at_fall integer NOT NULL,
  over_number numeric NOT NULL,
  wicket_number integer NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fall_of_wickets_pkey PRIMARY KEY (id),
  CONSTRAINT fall_of_wickets_innings_id_fkey FOREIGN KEY (innings_id) REFERENCES public.innings(id),
  CONSTRAINT fall_of_wickets_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id)
);
CREATE TABLE public.ball_events (
  innings_id uuid NOT NULL,
  over_number integer NOT NULL,
  ball_in_over integer NOT NULL,
  striker_player_id uuid,
  non_striker_player_id uuid,
  bowler_player_id uuid,
  extra_type USER-DEFINED,
  dismissal_type USER-DEFINED,
  dismissed_player_id uuid,
  fielder_player_id uuid,
  commentary text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  runs_bat integer NOT NULL DEFAULT 0,
  extras integer NOT NULL DEFAULT 0,
  is_wicket boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ball_events_pkey PRIMARY KEY (id),
  CONSTRAINT ball_events_innings_id_fkey FOREIGN KEY (innings_id) REFERENCES public.innings(id),
  CONSTRAINT ball_events_striker_player_id_fkey FOREIGN KEY (striker_player_id) REFERENCES public.players(id),
  CONSTRAINT ball_events_non_striker_player_id_fkey FOREIGN KEY (non_striker_player_id) REFERENCES public.players(id),
  CONSTRAINT ball_events_bowler_player_id_fkey FOREIGN KEY (bowler_player_id) REFERENCES public.players(id),
  CONSTRAINT ball_events_dismissed_player_id_fkey FOREIGN KEY (dismissed_player_id) REFERENCES public.players(id),
  CONSTRAINT ball_events_fielder_player_id_fkey FOREIGN KEY (fielder_player_id) REFERENCES public.players(id)
);
CREATE TABLE public.player_performances (
  player_id uuid NOT NULL,
  match_id uuid,
  performance_date timestamp with time zone,
  notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  runs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  wickets integer NOT NULL DEFAULT 0,
  catches integer NOT NULL DEFAULT 0,
  run_outs integer NOT NULL DEFAULT 0,
  stumpings integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_performances_pkey PRIMARY KEY (id),
  CONSTRAINT player_performances_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id),
  CONSTRAINT player_performances_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.notifications (
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  match_id uuid,
  tournament_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL DEFAULT 'system'::notification_type,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id),
  CONSTRAINT notifications_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id)
);
