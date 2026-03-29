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