import { Team } from "@/types";
import { TypeTeamInfo } from "@/types/team";
import { supabase } from "./supabaseClient";

// Used when a team row has no colour (matches Colors.ink).
const DEFAULT_TEAM_COLOR = '#16181D';

// Teams are archived, never deleted. Archiving unassigns the team's players;
// the team and its match history stay readable. Needs migration 20261124000000.
export const archiveTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase.rpc('archive_team', { p_team_id: teamId });
  if (error) {
    console.error("Error archiving team:", error);
    throw error;
  }
};

export const restoreTeam = async (teamId: string): Promise<void> => {
  const { error } = await supabase.rpc('restore_team', { p_team_id: teamId });
  if (error) {
    console.error("Error restoring team:", error);
    throw error;
  }
};

export const uploadTeamInfo = async (teamInfo: TypeTeamInfo) => {
  const { error } = await supabase
    .from('teams')
    .insert(teamInfo);
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
    color: team.color || DEFAULT_TEAM_COLOR,
    logo: team.logo_url,
    players: [], // Will be populated separately
    captain: team.captain_player_id,
    archivedAt: team.archived_at ?? undefined,
  }));
};
