// Tournaments: one league (round robin), optionally followed by knockouts.
// Stored in Supabase `tournaments`, `tournament_teams` (entries) and
// `tournament_matches` (migration 20261128000000).

export type TournamentSport = 'cricket' | 'football' | 'table_tennis';

/** Table tennis only: one player per entry, or a pair. */
export type TournamentFormat = 'single' | 'double';

/** 'live' while running, 'completed' once finished (shown under Archived). */
export type TournamentStatus = 'live' | 'completed';

/** How many teams go from the league to knockouts: 0 league only, 2 final, 4 semi-finals. */
export type Qualifiers = 0 | 2 | 4;

export type TournamentStage = 'league' | 'semi' | 'final';

/** 'A' / 'B' won, 'draw' (a tie in cricket), 'no_result' (abandoned). */
export type MatchOutcome = 'A' | 'B' | 'draw' | 'no_result';

/** A team in the tournament: a cricket/football team, or 1–2 table tennis players. */
export interface TournamentEntry {
  id: string;
  tournamentId: string;
  teamId: string | null;
  name: string;
  playerIds: string[];
  seed: number;
  /** Set by an admin when tie-breakers can't separate teams (lower goes first). */
  tieBreakRank: number | null;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  stage: TournamentStage;
  round: number;
  entryAId: string;
  entryBId: string;
  status: 'upcoming' | 'completed';
  /** Runs (cricket), goals (football) or games won (table tennis). */
  scoreA: number | null;
  scoreB: number | null;
  /** Cricket only. */
  wicketsA: number | null;
  wicketsB: number | null;
  ballsA: number | null;
  ballsB: number | null;
  outcome: MatchOutcome | null;
  completedAt: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  sport: TournamentSport;
  format: TournamentFormat | null;
  oversPerInnings: number | null;
  playersPerSide: number | null;
  qualifiers: Qualifiers;
  status: TournamentStatus;
  startDate: string | null;
  endDate: string | null;
  winnerEntryId: string | null;
  createdAt: string;
  entries: TournamentEntry[];
  matches: TournamentMatch[];
}

/** What an admin enters for a finished match. */
export interface MatchResultInput {
  scoreA: number;
  scoreB: number;
  wicketsA?: number | null;
  wicketsB?: number | null;
  ballsA?: number | null;
  ballsB?: number | null;
  outcome: MatchOutcome;
}

export interface NewTournamentEntry {
  teamId: string | null;
  name: string;
  playerIds: string[];
}

export interface NewTournament {
  name: string;
  sport: TournamentSport;
  format: TournamentFormat | null;
  oversPerInnings: number | null;
  playersPerSide: number | null;
  qualifiers: Qualifiers;
  entries: NewTournamentEntry[];
}

/** One row of the league table. */
export interface StandingRow {
  entryId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  noResult: number;
  points: number;
  /** Runs, goals or games scored / conceded. */
  scored: number;
  conceded: number;
  /** Net run rate (cricket), goal difference (football), game difference (table tennis). */
  net: number;
  /** Cricket: runs and balls used for net run rate. */
  runsFor: number;
  ballsFaced: number;
  runsAgainst: number;
  ballsBowled: number;
}

export interface Standings {
  rows: StandingRow[];
  /**
   * Groups of entry ids that every tie-breaker leaves level and that no admin
   * has ordered yet. Their order in `rows` is by seed until an admin picks.
   */
  unresolvedTies: string[][];
}
