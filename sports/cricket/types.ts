import { MatchStatus } from '@/types';

export type CricketMatchType = 'long' | 'short';
export type TossDecision = 'bat' | 'bowl';

export interface Substitute {
  playerId: string;
  canBat: boolean;
  canBowl: boolean;
}

export interface CricketMatch {
  id: string;
  sport: 'cricket';
  status: MatchStatus;
  matchType: CricketMatchType;
  totalOvers: number;
  ground: string;
  teamA: string;
  teamB: string;
  tossWinner: string;
  tossDecision: TossDecision;
  playingXI_A: string[];
  playingXI_B: string[];
  substitutes_A: Substitute[];
  substitutes_B: Substitute[];
  currentInnings: 1 | 2;
  innings: CricketInnings[];
  winner?: string;
  result?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CricketInnings {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: CricketExtras;
  batsmen: BatsmanScore[];
  bowlers: BowlerStats[];
  currentStriker?: string;
  currentNonStriker?: string;
  currentBowler?: string;
  allBalls: BallEvent[];
  thisOver: BallEvent[];
  fallOfWickets: FallOfWicket[];
}

export interface CricketExtras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

export interface BatsmanScore {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalType?: TypeDismissalType;
  dismissedBy?: string;
  caughtBy?: string;
  runoutBy?: string;
  stumpedBy?: string;
}

export type TypeDismissalType = 'caught' | 'run_out' | 'bowled' | 'retired' | 'stumped' | 'hit_wicket';

export interface BowlerStats {
  playerId: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}

export interface BallEvent {
  id: string;
  over: number;
  ball: number;
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  runs: number;
  extras: number;
  extraType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  isWicket: boolean;
  wicketType?: string;
  outPlayerId?: string;
  timestamp: string;
}

export interface FallOfWicket {
  playerId: string;
  runs: number;
  overs: number;
  wicketNumber: number;
}

// Row shape for the Supabase `ball_info` table
export type TypeBallInfo = {
  matchId: number;
  innings: number;
  over: number;
  ball: number;
  strikerId: string;
  bowlerId: string;
  runs: number;
  extra_type?: 'wide' | 'no_ball' | 'bye' | 'leg_bye';
  wicket: boolean;
  wicket_type?: string;
  commentary: string;
};
