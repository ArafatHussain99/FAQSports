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
