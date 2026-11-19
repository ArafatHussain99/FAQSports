import { Team } from "@/types";
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

export const getTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  if (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }

  // Transform Supabase data to match Team interface
  return (data || []).map(team => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name || '',
    color: team.color || '#000000',
    logo: team.logo_url,
    players: [], // Will be populated separately
    captain: team.captain_player_id,
  }));
};
