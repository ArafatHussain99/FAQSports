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