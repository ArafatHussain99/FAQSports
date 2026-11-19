import { Player } from "@/types";
import { TypePlayerInfo, TypePlayerStats } from "@/types/player";
import { supabase } from "./supabaseClient";

export const uploadPlayerInfo = async (playerInfo: TypePlayerInfo): Promise<string> => {
  const { data, error } = await supabase
    .from('players')
    .insert(playerInfo)
    .select('id')
    .single();
  if (error) {
    console.error("Error uploading player info:", error);
    throw error;
  }
  return data.id;
}
export const uploadPlayerStats = async (playerStats: TypePlayerStats) => {
  const { error } = await supabase
    .from('player_stats')
    .insert(playerStats);
  if (error) {
    console.error("Error uploading player stats:", error);
    throw error;
  }
}

export const deletePlayerInfo = async (playerId: string) => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', playerId);
  if (error) {
    console.error("Error uploading team info:", error);
    throw error;
  }
}

type PlayerRecord = {
  id: string;
  name: string;
  team_id: string | null;
  position: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  matches: number | null;
  runs: number | null;
  balls: number | null;
  wickets: number | null;
  catches: number | null;
  run_outs: number | null;
  stumpings: number | null;
  highest_score: number | null;
  best_bowling_wickets: number | null;
  fifties: number | null;
  centuries: number | null;
  batting_average: number | null;
  strike_rate: number | null;
  economy_rate: number | null;
  goals: number | null;
  assists: number | null;
  wins: number | null;
};

const mapPlayerRecord = (player: PlayerRecord): Player => {
  const bestBowlingWickets = player.best_bowling_wickets ?? 0;

  return {
    id: player.id,
    name: player.name,
    teamId: player.team_id ?? undefined,
    position: player.position ?? undefined,
    battingStyle: player.batting_style as Player['battingStyle'],
    bowlingStyle: player.bowling_style ?? undefined,
    stats: {
      matches: player.matches ?? 0,
      runs: player.runs ?? 0,
      balls: player.balls ?? 0,
      wickets: player.wickets ?? 0,
      catches: player.catches ?? 0,
      runOuts: player.run_outs ?? 0,
      stumpings: player.stumpings ?? 0,
      highestScore: player.highest_score ?? 0,
      bestBowling: bestBowlingWickets ? `${bestBowlingWickets} wickets` : '-',
      bestBowlingWickets,
      fifties: player.fifties ?? 0,
      centuries: player.centuries ?? 0,
      average: player.batting_average ?? 0,
      strikeRate: player.strike_rate ?? 0,
      economyRate: player.economy_rate ?? 0,
      goals: player.goals ?? 0,
      assists: player.assists ?? 0,
      wins: player.wins ?? 0,
    },
    ratings: { batting: 50, bowling: 50, fielding: 50, overall: 50 },
    lastFivePerformances: [],
  };
};

export const getPlayers = async (): Promise<Player[]> => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name');

  if (error) {
    console.error("Error fetching players:", error);
    throw error;
  }

  return ((data ?? []) as PlayerRecord[]).map(mapPlayerRecord);
};

export const getTeamPlayers = async (teamId: string): Promise<Player[]> => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('name');

  if (error) {
    console.error("Error fetching team players:", error);
    throw error;
  }

  return ((data ?? []) as PlayerRecord[]).map(mapPlayerRecord);
};
