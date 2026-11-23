import { MatchStatus } from '@/types';

/** A team is one player (singles) or two players (doubles). */
export type TTFormat = 'single' | 'double';

/** Which side of the net: Team A or Team B. */
export type TTSide = 'A' | 'B';

/**
 * Who serves first in a game, and (for doubles) which player of each team
 * starts on the right-hand side. The server always serves from the right.
 * In singles the "right" player is just the team's only player.
 */
export interface TTGameSetup {
  firstServer: TTSide;
  rightA: string;
  rightB: string;
}

/** One rally won by one side. The server is recorded for the scorecard. */
export interface TTPoint {
  game: number; // 0-based game index
  winner: TTSide;
  serverId: string;
  at: string; // ISO timestamp
}

export interface TTMatchConfig {
  format: TTFormat;
  bestOf: number; // 3, 5 or 7 games
  pointsToWin: number; // 11 with 2 serves per turn, 21 with 5 (see pointsToWinForServes)
  servesPerTurn: number; // singles usually 2, doubles house rule 5
  teamA: string[]; // player ids
  teamB: string[];
}

export interface TableTennisMatch extends TTMatchConfig {
  id: string;
  venue: string | null;
  status: MatchStatus;
  gameSetups: TTGameSetup[];
  points: TTPoint[];
  winner: TTSide | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/** Score of a single game, derived from the point log. */
export interface TTGameScore {
  a: number;
  b: number;
  winner: TTSide | null;
}

/** Everything the scorecard needs, derived from config + setups + points. */
export interface TTMatchState {
  games: TTGameScore[];
  currentGame: number;
  gamesWonA: number;
  gamesWonB: number;
  scoreA: number;
  scoreB: number;
  setup: TTGameSetup;
  /** Player currently on the right / left for each team (doubles). */
  positions: Record<TTSide, { right: string; left: string | null }>;
  servingSide: TTSide;
  serverId: string;
  receiverId: string;
  /** Serves left in the current service turn (including the next one). */
  servesLeft: number;
  /** Both sides on game point or beyond (10-10 / 20-20 and later). */
  isDeuce: boolean;
  /** During deuce: the side one point ahead (wins with the next point), or null when level. */
  advantage: TTSide | null;
  /** The current game is finished but the match is not (next game not started yet). */
  gameJustEnded: boolean;
  matchOver: boolean;
  matchWinner: TTSide | null;
}

/** Row in the Supabase `table_tennis_matches` table. */
export type TableTennisMatchRow = {
  id: string;
  format: TTFormat;
  best_of: number;
  points_to_win: number;
  serves_per_turn: number;
  team_a_player_ids: string[];
  team_b_player_ids: string[];
  venue: string | null;
  status: MatchStatus;
  game_setups: TTGameSetup[] | null;
  points: TTPoint[] | null;
  winner_side: TTSide | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type NewTableTennisMatch = TTMatchConfig & {
  venue: string | null;
  status: 'upcoming' | 'live';
};

export type TableTennisMatchUpdate = Partial<{
  status: MatchStatus;
  gameSetups: TTGameSetup[];
  points: TTPoint[];
  winner: TTSide | null;
  startedAt: string | null;
  completedAt: string | null;
}>;
