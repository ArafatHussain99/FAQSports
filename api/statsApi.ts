import { supabase } from "./supabaseClient";

// Per-match player stats, team history and sport awards.
// Needs migration supabase/migrations/20261124000000_team_archive_match_stats_awards.sql.

/** Sports that record match stats and awards. */
export type StatSport = 'cricket' | 'football' | 'table_tennis';

/** One player's line for one finished match. Unset numbers count as 0. */
export type MatchStatLine = {
  player_id: string;
  team_id: string | null;
  // cricket
  runs?: number;
  balls?: number;
  fours?: number;
  sixes?: number;
  batted?: boolean;
  dismissed?: boolean;
  wickets?: number;
  balls_bowled?: number;
  runs_conceded?: number;
  catches?: number;
  run_outs?: number;
  stumpings?: number;
  // football
  goals?: number;
  assists?: number;
  // football / table tennis result for this player's side
  won?: boolean | null;
};

/**
 * Records a finished match. Each player's line is stored once per match (a
 * repeat call is ignored), rolled up into player_stats, and used to raise
 * records such as highest score and best bowling. Admins only.
 */
export const recordMatchStats = async (
  sport: StatSport,
  matchId: string,
  lines: MatchStatLine[]
): Promise<number> => {
  if (lines.length === 0) return 0;
  const { data, error } = await supabase.rpc('record_match_stats', {
    p_sport: sport,
    p_match_id: matchId,
    p_lines: lines,
  });
  if (error) {
    console.error("Error recording match stats:", error);
    throw error;
  }
  return (data as number) ?? 0;
};

export type PlayerMatchStatRow = {
  sport: StatSport;
  match_id: string;
  player_id: string;
  team_id: string | null;
  team_name: string | null;
  played_at: string;
  runs: number;
  balls: number;
  wickets: number;
  catches: number;
  goals: number;
  assists: number;
  won: boolean | null;
};

/** Totals for one player while playing for one team. */
export type TeamSpell = {
  teamId: string | null;
  teamName: string;
  sport: StatSport;
  matches: number;
  runs: number;
  wickets: number;
  goals: number;
  wins: number;
  lastPlayed: string;
};

const SELECT_COLUMNS =
  'sport, match_id, player_id, team_id, team_name, played_at, runs, balls, wickets, catches, goals, assists, won';

/** Every match line a player has, newest first. */
export const getPlayerMatchStats = async (playerId: string): Promise<PlayerMatchStatRow[]> => {
  const { data, error } = await supabase
    .from('player_match_stats')
    .select(SELECT_COLUMNS)
    .eq('player_id', playerId)
    .order('played_at', { ascending: false });
  if (error) {
    console.error("Error fetching player match stats:", error);
    throw error;
  }
  return (data ?? []) as PlayerMatchStatRow[];
};

/** Every match line recorded for a team, including players who have since left. */
export const getTeamMatchStats = async (teamId: string): Promise<PlayerMatchStatRow[]> => {
  const { data, error } = await supabase
    .from('player_match_stats')
    .select(SELECT_COLUMNS)
    .eq('team_id', teamId)
    .order('played_at', { ascending: false });
  if (error) {
    console.error("Error fetching team match stats:", error);
    throw error;
  }
  return (data ?? []) as PlayerMatchStatRow[];
};

/** Every match line played in one calendar year (local time), for yearly leaderboards. */
export const getMatchStatsForYear = async (year: number): Promise<PlayerMatchStatRow[]> => {
  const from = new Date(year, 0, 1).toISOString();
  const to = new Date(year + 1, 0, 1).toISOString();
  const { data, error } = await supabase
    .from('player_match_stats')
    .select(SELECT_COLUMNS)
    .gte('played_at', from)
    .lt('played_at', to);
  if (error) {
    console.error("Error fetching yearly match stats:", error);
    throw error;
  }
  return (data ?? []) as PlayerMatchStatRow[];
};

/** Groups a player's match lines by team (and sport), most recent team first. */
export const groupByTeam = (rows: PlayerMatchStatRow[]): TeamSpell[] => {
  const spells = new Map<string, TeamSpell>();
  for (const row of rows) {
    const key = `${row.sport}:${row.team_id ?? row.team_name ?? 'none'}`;
    const spell = spells.get(key) ?? {
      teamId: row.team_id,
      teamName: row.team_name ?? 'No team',
      sport: row.sport,
      matches: 0,
      runs: 0,
      wickets: 0,
      goals: 0,
      wins: 0,
      lastPlayed: row.played_at,
    };
    spell.matches += 1;
    spell.runs += row.runs ?? 0;
    spell.wickets += row.wickets ?? 0;
    spell.goals += row.goals ?? 0;
    spell.wins += row.won ? 1 : 0;
    if (row.played_at > spell.lastPlayed) spell.lastPlayed = row.played_at;
    spells.set(key, spell);
  }
  return [...spells.values()].sort((a, b) => (a.lastPlayed < b.lastPlayed ? 1 : -1));
};

/** Totals per player for one team's match lines (current and former players). */
export type TeamPlayerTotals = {
  playerId: string;
  matches: number;
  runs: number;
  wickets: number;
  goals: number;
};

export const totalsByPlayer = (rows: PlayerMatchStatRow[]): TeamPlayerTotals[] => {
  const totals = new Map<string, TeamPlayerTotals>();
  for (const row of rows) {
    const t = totals.get(row.player_id) ?? { playerId: row.player_id, matches: 0, runs: 0, wickets: 0, goals: 0 };
    t.matches += 1;
    t.runs += row.runs ?? 0;
    t.wickets += row.wickets ?? 0;
    t.goals += row.goals ?? 0;
    totals.set(row.player_id, t);
  }
  return [...totals.values()];
};

// -----------------------------------------------------------------------------
// Awards: current champion (place 1) and runner-up (place 2) per sport
// -----------------------------------------------------------------------------

export type AwardPlace = 1 | 2;

/** 'main' for cricket and football; table tennis has 'singles' and 'doubles'. */
export type AwardCategory = 'main' | 'singles' | 'doubles';

export const awardCategoriesFor = (sport: StatSport): AwardCategory[] =>
  sport === 'table_tennis' ? ['singles', 'doubles'] : ['main'];

export type SportAward = {
  sport: StatSport;
  category: AwardCategory;
  place: AwardPlace;
  teamId: string | null;
  playerId: string | null;
  awardedAt: string;
  /** Players recognised: the squad at award time, or the singles player / doubles pair. */
  recipientIds: string[];
};

// Needs migration 20261126000000 (award categories) for `category`.
export const getSportAwards = async (): Promise<SportAward[]> => {
  const [awardsRes, recipientsRes] = await Promise.all([
    supabase.from('sport_awards').select('sport, category, place, team_id, player_id, awarded_at'),
    supabase.from('sport_award_recipients').select('sport, category, place, player_id'),
  ]);
  if (awardsRes.error) {
    console.error("Error fetching awards:", awardsRes.error);
    throw awardsRes.error;
  }
  if (recipientsRes.error) {
    console.error("Error fetching award recipients:", recipientsRes.error);
    throw recipientsRes.error;
  }
  const recipients = recipientsRes.data ?? [];
  return (awardsRes.data ?? []).map((a) => ({
    sport: a.sport as StatSport,
    category: (a.category ?? 'main') as AwardCategory,
    place: a.place as AwardPlace,
    teamId: a.team_id,
    playerId: a.player_id,
    awardedAt: a.awarded_at,
    recipientIds: recipients
      .filter((r) => r.sport === a.sport && r.category === a.category && r.place === a.place)
      .map((r) => r.player_id as string),
  }));
};

/**
 * Gives the award to a team (cricket, football) or to players (table tennis:
 * one for singles, two for doubles). Admins only.
 */
export const setSportAward = async (
  sport: StatSport,
  category: AwardCategory,
  place: AwardPlace,
  target: { teamId: string } | { playerIds: string[] }
): Promise<void> => {
  const { error } = await supabase.rpc('set_sport_award', {
    p_sport: sport,
    p_category: category,
    p_place: place,
    p_team_id: 'teamId' in target ? target.teamId : null,
    p_player_ids: 'playerIds' in target ? target.playerIds : null,
  });
  if (error) {
    console.error("Error setting award:", error);
    throw error;
  }
};

export const clearSportAward = async (
  sport: StatSport,
  category: AwardCategory,
  place: AwardPlace
): Promise<void> => {
  const { error } = await supabase.rpc('clear_sport_award', {
    p_sport: sport,
    p_category: category,
    p_place: place,
  });
  if (error) {
    console.error("Error clearing award:", error);
    throw error;
  }
};
