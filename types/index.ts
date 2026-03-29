export type UserRole = 'admin' | 'player';

export type SportType = 'cricket' | 'football' | 'table_tennis' | 'badminton' | 'carrom' | 'uno';

export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

export type CricketMatchType = 'long' | 'short';
export type TossDecision = 'bat' | 'bowl';

export type FootballMatchFormat = 'friendly' | 'league' | 'knockout' | 'tournament';
export type FootballGoalType = 'fieldGoal' | 'penalty' | 'ownGoal';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  teamId?: string;
  position?: string;
  battingStyle?: 'right' | 'left';
  bowlingStyle?: string;
  stats: PlayerStats;
  ratings: PlayerRatings;
  lastFivePerformances: PerformanceSummary[];
}

export interface PlayerStats {
  matches: number;
  runs: number;
  balls: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
  highestScore: number;
  bestBowling: string;
  fifties: number;
  centuries: number;
  average: number;
  strikeRate: number;
  economyRate: number;
  // Football stats
  goals?: number;
  assists?: number;
  saves?: number;
  yellowCards?: number;
  redCards?: number;
  // Table Tennis stats
  wins?: number;
  losses?: number;
  pointsFor?: number;
  pointsAgainst?: number;
}

export interface PlayerRatings {
  batting: number;
  bowling: number;
  fielding: number;
  overall: number;
}

export interface PerformanceSummary {
  matchId: string;
  date: string;
  opponent: string;
  runs: number;
  balls: number;
  wickets: number;
  overs: number;
  catches: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  color: string;
  players: string[];
  captain?: string;
}

export interface Tournament {
  id: string;
  name: string;
  sport: SportType;
  teams: string[];
  startDate: string;
  endDate?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  matches: string[];
  winner?: string;
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
  substitutes_A: string[];
  substitutes_B: string[];
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

export interface FootballMatch {
  id: string;
  sport: 'football';
  status: MatchStatus;
  format: FootballMatchFormat;
  duration: number; // in minutes
  ground: string;
  teamA: string;
  teamB: string;
  playingXI_A: string[];
  playingXI_B: string[];
  substitutes_A: string[];
  substitutes_B: string[];
  score: FootballScore;
  events: FootballEvent[];
  winner?: string;
  result?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FootballScore {
  teamA: number;
  teamB: number;
  teamAPenalties?: number;
  teamBPenalties?: number;
}

export interface FootballPlayerStat {
  playerId: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  saves?: number; // for goalkeepers
  cards: {
    yellow: number;
    red: number;
  };
}

export interface FootballEvent {
  id: string;
  type: 'goal' | 'assist' | 'card' | 'substitution' | 'injury';
  minute: number;
  playerId: string;
  teamId: string;
  goalType?: FootballGoalType;
  cardColor?: 'yellow' | 'red';
  assistedBy?: string;
  substitutedOutBy?: string; // for substitution events
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match' | 'tournament' | 'system';
  isRead: boolean;
  createdAt: string;
  matchId?: string;
  tournamentId?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  playerId: string;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  actionType: string;
  matchId?: string;
  previousData?: string;
  updatedData?: string;
  timestamp: string;
}
