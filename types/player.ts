export type TypePlayerInfo = {
  id?: string;
  name: string;
  position: string;
  batting_style: string;
  bowling_style: string;
  cricket_team: string | undefined;
  ratings: TypePlayerRating;
};

export type TypePlayerRating = {
  batting: number;
  bowling: number;
  fielding: number;
  overall: number;
}

export type TypePlayerStats = {
  playerId: string,
  matches: number,
  runs: number,
  balls: number,
  wickets: number,
  catches: number,
  runOuts: number,
  stumpings: number,
  highestScore: number,
  bestBowlingWickets: number,
  bestBowlingRuns: number,
  fifties: number,
  centuries: number,
  average: number,
  strikeRate: number,
  economyRate: number,
  goals: number,
  assists: number,
  wins: number,
}