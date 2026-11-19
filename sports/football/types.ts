import { MatchStatus } from '@/types';

export type FootballMatchFormat = 'friendly' | 'league' | 'knockout' | 'tournament';
export type FootballGoalType = 'fieldGoal' | 'penalty' | 'ownGoal';

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
