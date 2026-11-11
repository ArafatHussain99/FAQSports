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