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

// Deletes the team; the database unassigns its players. A team that has
// played a saved match can't be deleted (RESTRICT), and a delete blocked by
// RLS removes 0 rows without an error, so an empty result is a failure.
export const deleteTeamInfo = async (teamId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
    .select('id');
  if (error) {
    console.error("Error deleting team:", error);
    throw error;
  }
  if (!data || data.length === 0) {
    throw new Error(
      "The team wasn't deleted. You may not have permission to delete teams, or the team no longer exists."
    );
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
