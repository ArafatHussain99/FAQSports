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

// Move a player to another team, or to no team (teamId = null).
// `.select('id')` returns the updated rows: an update blocked by RLS doesn't
// error, it just changes 0 rows, so an empty result is treated as a failure.
export const updatePlayerTeam = async (playerId: string, teamId: string | null): Promise<void> => {
  const { data, error } = await supabase
    .from('players')
    .update({ team_id: teamId })
    .eq('id', playerId)
    .select('id');

  if (error) {
    console.error("Error updating player team:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      "The player's team wasn't changed. You may not have permission to update players, or the player no longer exists."
    );
  }
};

// Update the profile fields shown on the Player Profile screen.
// Pass null to clear a field. Needs migration 20261119000200 (columns) and an
// admin UPDATE policy on players (20261119000100).
export const updatePlayerProfile = async (
  playerId: string,
  profile: { nickname: string | null; coverImageKey: string | null }
): Promise<void> => {
  const { data, error } = await supabase
    .from('players')
    .update({ nickname: profile.nickname, cover_image_key: profile.coverImageKey })
    .eq('id', playerId)
    .select('id');

  if (error) {
    console.error("Error updating player profile:", error);
    // PGRST204: column not found (the migration hasn't been applied yet)
    if (error.code === 'PGRST204') {
      throw new Error(
        'The database is missing the nickname / cover picture columns. Apply migration 20261119000200_players_nickname_cover.sql in Supabase.'
      );
    }
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error(
      "The profile wasn't updated. You may not have permission to update players, or the player no longer exists."
    );
  }
};

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
  nickname?: string | null;        // added by migration 20261119000200
  cover_image_key?: string | null; // added by migration 20261119000200
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
    nickname: player.nickname ?? undefined,
    coverImageKey: player.cover_image_key ?? undefined,
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
