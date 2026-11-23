import { supabase } from '@/api/supabaseClient';
import {
  NewTableTennisMatch,
  TableTennisMatch,
  TableTennisMatchRow,
  TableTennisMatchUpdate,
} from './types';

const TABLE = 'table_tennis_matches';

const mapRow = (row: TableTennisMatchRow): TableTennisMatch => ({
  id: row.id,
  format: row.format,
  bestOf: row.best_of,
  pointsToWin: row.points_to_win,
  servesPerTurn: row.serves_per_turn,
  teamA: row.team_a_player_ids ?? [],
  teamB: row.team_b_player_ids ?? [],
  venue: row.venue,
  status: row.status,
  gameSetups: row.game_setups ?? [],
  points: row.points ?? [],
  winner: row.winner_side,
  createdAt: row.created_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
});

export const getTableTennisMatches = async (): Promise<TableTennisMatch[]> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching table tennis matches:', error);
    throw error;
  }

  return ((data ?? []) as TableTennisMatchRow[]).map(mapRow);
};

export const getTableTennisMatch = async (id: string): Promise<TableTennisMatch | null> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching table tennis match:', error);
    throw error;
  }

  return data ? mapRow(data as TableTennisMatchRow) : null;
};

export const createTableTennisMatch = async (match: NewTableTennisMatch): Promise<string> => {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      format: match.format,
      best_of: match.bestOf,
      points_to_win: match.pointsToWin,
      serves_per_turn: match.servesPerTurn,
      team_a_player_ids: match.teamA,
      team_b_player_ids: match.teamB,
      venue: match.venue,
      status: match.status,
      game_setups: [],
      points: [],
      started_at: match.status === 'live' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating table tennis match:', error);
    throw error;
  }

  return data.id as string;
};

export const updateTableTennisMatch = async (id: string, update: TableTennisMatchUpdate) => {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (update.status !== undefined) row.status = update.status;
  if (update.gameSetups !== undefined) row.game_setups = update.gameSetups;
  if (update.points !== undefined) row.points = update.points;
  if (update.winner !== undefined) row.winner_side = update.winner;
  if (update.startedAt !== undefined) row.started_at = update.startedAt;
  if (update.completedAt !== undefined) row.completed_at = update.completedAt;

  const { data, error } = await supabase.from(TABLE).update(row).eq('id', id).select('id');

  if (error) {
    console.error('Error updating table tennis match:', error);
    throw error;
  }
  // RLS doesn't error on a refused update, it just changes 0 rows.
  if (!data || data.length === 0) {
    throw Object.assign(new Error('Table tennis match was not updated (no permission or not found)'), {
      code: '42501',
    });
  }
};

export const deleteTableTennisMatch = async (id: string) => {
  const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id');

  if (error) {
    console.error('Error deleting table tennis match:', error);
    throw error;
  }
  if (!data || data.length === 0) {
    throw Object.assign(new Error('Table tennis match was not deleted (no permission or not found)'), {
      code: '42501',
    });
  }
};
