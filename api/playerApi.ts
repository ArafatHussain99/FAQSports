import { Player } from "@/types";
import { TypePlayerInfo, TypePlayerStats } from "@/types/player";
import { supabase } from "./supabaseClient";

export const uploadPlayerInfo = async (playerInfo: TypePlayerInfo) => {
  const { error } = await supabase
    .from('players')
    .insert(playerInfo);
  if (error) {
    console.error("Error uploading team info:", error);
    throw error;
  }
}
export const uploadPlayerStats = async (playerStats: TypePlayerStats) => {
  const { error } = await supabase
    .from('player_stats')
    .insert(playerStats);
  if (error) {
    console.error("Error uploading team info:", error);
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

export const getPlayers = async (): Promise<Player[]> => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error("Error fetching players:", error);
    throw error;
  }

  // Fetch player stats in a second query
  const playerIds = (data || []).map(p => p.id);
  let stats: any[] = [];

  if (playerIds.length > 0) {
    const { data: statsData, error: statsError } = await supabase
      .from('player_stats')
      .select('*')
      .in('player_id', playerIds);

    if (!statsError) {
      stats = statsData || [];
    }
  }

  // Transform Supabase data to match Player interface
  return (data || []).map(player => {
    const playerStats = stats.find(s => s.player_id === player.id);
    return {
      id: player.id,
      name: player.full_name,
      avatar: player.avatar_url,
      teamId: player.team_id,
      position: player.position,
      battingStyle: player.batting_style as 'right' | 'left' | undefined,
      bowlingStyle: player.bowling_style,
      stats: {
        matches: playerStats?.matches || 0,
        runs: playerStats?.runs || 0,
        balls: playerStats?.balls || 0,
        wickets: playerStats?.wickets || 0,
        catches: playerStats?.catches || 0,
        runOuts: playerStats?.run_outs || 0,
        stumpings: playerStats?.stumpings || 0,
        highestScore: playerStats?.highest_score || 0,
        bestBowling: playerStats?.best_bowling || '-',
        fifties: playerStats?.fifties || 0,
        centuries: playerStats?.centuries || 0,
        average: playerStats?.batting_average || 0,
        strikeRate: playerStats?.strike_rate || 0,
        economyRate: playerStats?.economy_rate || 0,
        goals: playerStats?.goals || 0,
        assists: playerStats?.assists || 0,
        wins: playerStats?.wins || 0,
      },
      ratings: { batting: 50, bowling: 50, fielding: 50, overall: 50 }, // Default, can be fetched separately
      lastFivePerformances: [],
    };
  });
};

export const getTeamPlayers = async (teamId: string): Promise<Player[]> => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error("Error fetching team players:", error);
    throw error;
  }

  return (data || []).map(player => ({
    id: player.id,
    name: player.full_name,
    avatar: player.avatar_url,
    teamId: player.team_id,
    position: player.position,
    battingStyle: player.batting_style as 'right' | 'left' | undefined,
    bowlingStyle: player.bowling_style,
    stats: {
      matches: 0,
      runs: 0,
      balls: 0,
      wickets: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 0,
      bestBowling: '-',
      fifties: 0,
      centuries: 0,
      average: 0,
      strikeRate: 0,
      economyRate: 0,
      goals: 0,
      assists: 0,
      wins: 0,
    },
    ratings: { batting: 50, bowling: 50, fielding: 50, overall: 50 },
    lastFivePerformances: [],
  }));
};
