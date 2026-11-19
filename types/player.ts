export type TypePlayerInfo = {
  name: string;
  team_id: string | null;
  position: string | null;
  batting_style: string | null;
  bowling_style: string | null;
};

export type TypePlayerStats = {
  player_id: string;
  matches: number;
  runs: number;
  balls: number;
  wickets: number;
  catches: number;
  run_outs: number;
  stumpings: number;
  highest_score: number;
  best_bowling_wickets: number;
  fifties: number;
  centuries: number;
  batting_average: number;
  strike_rate: number;
  economy_rate: number;
  goals: number;
  assists: number;
  wins: number;
  best_bowling_runs: number;
};

export type TypePlayerRating = {
  batting: number;
  bowling: number;
  fielding: number;
  overall: number;
}