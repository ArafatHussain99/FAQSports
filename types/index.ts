export type UserRole = 'admin' | 'player';

export type SportType = 'cricket' | 'football' | 'table_tennis' | 'badminton' | 'carrom' | 'uno';

/** Sports that have teams. Each team belongs to exactly one. */
export type TeamSport = 'cricket' | 'football';

export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';

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
  nickname?: string;
  /** Key of a bundled cover picture (constants/playerCovers.ts), not a URL. */
  coverImageKey?: string;
  avatar?: string;
  /** Cricket team (players.team_id). */
  teamId?: string;
  /** Football team (players.football_team_id). */
  footballTeamId?: string;
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
  bestBowlingWickets?: number;
  fifties: number;
  centuries: number;
  average: number;
  strikeRate: number;
  economyRate: number;
  // Football stats (player_stats.goals / assists / wins)
  goals?: number;
  assists?: number;
  saves?: number;
  yellowCards?: number;
  redCards?: number;
  /** Football wins. Not cricket. */
  wins?: number;
  losses?: number;
  // Table tennis stats (player_stats.tt_matches / tt_wins / tt_losses)
  ttMatches?: number;
  ttWins?: number;
  ttLosses?: number;
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
  sport: TeamSport;
  logo?: string;
  color: string;
  players: string[];
  captain?: string;
  /** Set when the team is archived (teams can't be deleted). */
  archivedAt?: string;
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
