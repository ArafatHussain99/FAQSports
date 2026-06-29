import { TypeTeamInfo } from "@/types/team";
import { supabase } from "./supabaseClient";

export const uploadTeamInfo = async (teamInfo: TypeTeamInfo) => {
  const { error } = await supabase
    .from('teams')
    .insert(teamInfo);
  if (error) {
    console.error("Error uploading team info:", error);
    throw error;
  }
}

export const deleteTeamInfo = async (teamId: string) => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);
  if (error) {
    console.error("Error uploading team info:", error);
    throw error;
  }
}