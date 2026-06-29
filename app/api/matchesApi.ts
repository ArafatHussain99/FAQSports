import { Player, Team } from "@/types";
import { TypeBallInfo } from "@/types/match";
import { supabase } from "./supabaseClient";

// ===================================================================
// AUTHENTICATION
// ===================================================================

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.error("Error signing up:", error);
    throw error;
  }

  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error signing in:", error);
    throw error;
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return data.user;
};

export const getUserRole = async (email: string): Promise<'admin' | 'player' | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single();

  console.log("data: ", data);

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return (data?.role as 'admin' | 'player') || null;
};

export const getMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select('*');

  if (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }

  console.log("Data:", data.map(player => (player.name)));

  return data;
};

export const uploadBallInfo = async (ballInfo: TypeBallInfo) => {
  const { data, error } = await supabase
    .from('ball_info')
    .insert(ballInfo);
  if (error) {
    console.error("Error uploading ball info:", error);
    throw error;
  }
}

// ===================================================================
// TEAMS
// ===================================================================

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

// ===================================================================
// PLAYERS
// ===================================================================

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

// ===================================================================
// GROUNDS
// ===================================================================

export const getGrounds = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('grounds')
    .select('name')
    .order('name');

  if (error) {
    console.error("Error fetching grounds:", error);
    throw error;
  }

  return (data || []).map(g => g.name);
};

export const addGround = async (groundName: string, location?: string): Promise<void> => {
  const { error } = await supabase
    .from('grounds')
    .insert({
      name: groundName,
      location: location || null,
    });

  if (error) {
    console.error("Error adding ground:", error);
    throw error;
  }
};
