import { supabase } from '@/api/supabaseClient';
import { roundRobinFixtures } from './standings';
import {
  MatchResultInput,
  NewTournament,
  Qualifiers,
  Tournament,
  TournamentEntry,
  TournamentMatch,
  TournamentStage,
} from './types';

// Needs migration supabase/migrations/20261128000000_tournaments.sql.
// Reads are open to everyone; every write is admin-only (RLS + is_admin()).

type EntryRow = {
  id: string;
  tournament_id: string;
  team_id: string | null;
  name: string | null;
  player_ids: string[] | null;
  seed: number | null;
  tie_break_rank: number | null;
};

type MatchRow = {
  id: string;
  tournament_id: string;
  stage: TournamentStage;
  round: number;
  entry_a_id: string;
  entry_b_id: string;
  status: 'upcoming' | 'completed';
  score_a: number | null;
  score_b: number | null;
  wickets_a: number | null;
  wickets_b: number | null;
  balls_a: number | null;
  balls_b: number | null;
  outcome: TournamentMatch['outcome'];
  completed_at: string | null;
};

type TournamentRow = {
  id: string;
  name: string;
  sport: Tournament['sport'];
  format: Tournament['format'];
  overs_per_innings: number | null;
  players_per_side: number | null;
  qualifiers: number | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  winner_entry_id: string | null;
  created_at: string;
  tournament_teams: EntryRow[] | null;
  tournament_matches: MatchRow[] | null;
};

const SELECT = `
  id, name, sport, format, overs_per_innings, players_per_side, qualifiers, status,
  start_date, end_date, winner_entry_id, created_at,
  tournament_teams ( id, tournament_id, team_id, name, player_ids, seed, tie_break_rank ),
  tournament_matches ( id, tournament_id, stage, round, entry_a_id, entry_b_id, status,
    score_a, score_b, wickets_a, wickets_b, balls_a, balls_b, outcome, completed_at )
`;

const STAGE_ORDER: Record<TournamentStage, number> = { league: 0, semi: 1, final: 2 };

const mapEntry = (row: EntryRow, index: number): TournamentEntry => ({
  id: row.id,
  tournamentId: row.tournament_id,
  teamId: row.team_id,
  name: row.name ?? `Team ${index + 1}`,
  playerIds: row.player_ids ?? [],
  seed: row.seed ?? index + 1,
  tieBreakRank: row.tie_break_rank,
});

const mapMatch = (row: MatchRow): TournamentMatch => ({
  id: row.id,
  tournamentId: row.tournament_id,
  stage: row.stage,
  round: row.round,
  entryAId: row.entry_a_id,
  entryBId: row.entry_b_id,
  status: row.status,
  scoreA: row.score_a,
  scoreB: row.score_b,
  wicketsA: row.wickets_a,
  wicketsB: row.wickets_b,
  ballsA: row.balls_a,
  ballsB: row.balls_b,
  outcome: row.outcome,
  completedAt: row.completed_at,
});

const mapTournament = (row: TournamentRow): Tournament => ({
  id: row.id,
  name: row.name,
  sport: row.sport,
  format: row.format,
  oversPerInnings: row.overs_per_innings,
  playersPerSide: row.players_per_side,
  qualifiers: ([0, 2, 4].includes(row.qualifiers ?? 0) ? row.qualifiers ?? 0 : 0) as Qualifiers,
  // tournament_status also has 'upcoming'; treat it as running.
  status: row.status === 'completed' ? 'completed' : 'live',
  startDate: row.start_date,
  endDate: row.end_date,
  winnerEntryId: row.winner_entry_id,
  createdAt: row.created_at,
  entries: [...(row.tournament_teams ?? [])]
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
    .map(mapEntry),
  matches: (row.tournament_matches ?? [])
    .map(mapMatch)
    .sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || a.round - b.round),
});

/** An update or delete refused by RLS succeeds with 0 rows; report it as "not allowed". */
const assertRows = (data: unknown[] | null, what: string) => {
  if (!data || data.length === 0) {
    throw Object.assign(new Error(`${what} (no permission or not found)`), { code: '42501' });
  }
};

export const getTournaments = async (): Promise<Tournament[]> => {
  const { data, error } = await supabase
    .from('tournaments')
    .select(SELECT)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching tournaments:', error);
    throw error;
  }
  return ((data ?? []) as unknown as TournamentRow[]).map(mapTournament);
};

/** Creates the tournament, its entries and its round-robin league fixtures. Returns the new id. */
export const createTournament = async (input: NewTournament): Promise<string> => {
  const { data, error } = await supabase.rpc('create_tournament', {
    p_name: input.name,
    p_sport: input.sport,
    p_format: input.format,
    p_overs_per_innings: input.oversPerInnings,
    p_players_per_side: input.playersPerSide,
    p_qualifiers: input.qualifiers,
    p_entries: input.entries.map(e => ({ team_id: e.teamId, name: e.name, player_ids: e.playerIds })),
    p_fixtures: roundRobinFixtures(input.entries.length),
  });
  if (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
  return data as string;
};

export const saveMatchResult = async (matchId: string, result: MatchResultInput) => {
  const { data, error } = await supabase
    .from('tournament_matches')
    .update({
      status: 'completed',
      score_a: result.scoreA,
      score_b: result.scoreB,
      wickets_a: result.wicketsA ?? null,
      wickets_b: result.wicketsB ?? null,
      balls_a: result.ballsA ?? null,
      balls_b: result.ballsB ?? null,
      outcome: result.outcome,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select('id');
  if (error) {
    console.error('Error saving tournament result:', error);
    throw error;
  }
  assertRows(data, 'Result was not saved');
};

export const clearMatchResult = async (matchId: string) => {
  const { data, error } = await supabase
    .from('tournament_matches')
    .update({
      status: 'upcoming',
      score_a: null,
      score_b: null,
      wickets_a: null,
      wickets_b: null,
      balls_a: null,
      balls_b: null,
      outcome: null,
      completed_at: null,
    })
    .eq('id', matchId)
    .select('id');
  if (error) {
    console.error('Error clearing tournament result:', error);
    throw error;
  }
  assertRows(data, 'Result was not cleared');
};

export const createKnockoutMatches = async (
  tournamentId: string,
  stage: TournamentStage,
  pairs: [string, string][]
) => {
  const { data, error } = await supabase
    .from('tournament_matches')
    .insert(pairs.map(([a, b]) => ({
      tournament_id: tournamentId,
      stage,
      round: 1,
      entry_a_id: a,
      entry_b_id: b,
    })))
    .select('id');
  if (error) {
    console.error('Error creating knockout matches:', error);
    throw error;
  }
  assertRows(data, 'Knockout matches were not created');
};

/** Orders entries that the tie-breakers leave level (lower rank goes first). */
export const setTieBreakRanks = async (ranks: { entryId: string; rank: number }[]) => {
  for (const { entryId, rank } of ranks) {
    const { data, error } = await supabase
      .from('tournament_teams')
      .update({ tie_break_rank: rank })
      .eq('id', entryId)
      .select('id');
    if (error) {
      console.error('Error saving tie-break order:', error);
      throw error;
    }
    assertRows(data, 'Tie-break order was not saved');
  }
};

export const renameEntry = async (entryId: string, name: string) => {
  const { data, error } = await supabase
    .from('tournament_teams')
    .update({ name: name.trim() })
    .eq('id', entryId)
    .select('id');
  if (error) {
    console.error('Error renaming tournament team:', error);
    throw error;
  }
  assertRows(data, 'Team was not renamed');
};

/** Marks the tournament finished; it then shows under Archived. */
export const finishTournament = async (tournamentId: string, winnerEntryId: string) => {
  const { data, error } = await supabase
    .from('tournaments')
    .update({
      status: 'completed',
      winner_entry_id: winnerEntryId,
      end_date: new Date().toISOString().slice(0, 10),
    })
    .eq('id', tournamentId)
    .select('id');
  if (error) {
    console.error('Error finishing tournament:', error);
    throw error;
  }
  assertRows(data, 'Tournament was not finished');
};

/** Deletes the tournament with its entries and matches. */
export const deleteTournament = async (tournamentId: string) => {
  const { data, error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
    .select('id');
  if (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
  assertRows(data, 'Tournament was not deleted');
};
