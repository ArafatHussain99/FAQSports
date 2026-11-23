import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  createTableTennisMatch,
  deleteTableTennisMatch,
  getTableTennisMatches,
  updateTableTennisMatch,
} from './api';
import { NewTableTennisMatch, TableTennisMatch, TableTennisMatchUpdate } from './types';

export const TABLE_TENNIS_MATCHES_KEY = ['table-tennis-matches'] as const;
export const tableTennisMatchKey = (id: string) => ['table-tennis-match', id] as const;

export const [TableTennisMatchProvider, useTableTennisMatches] = createContextHook(() => {
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({
    queryKey: TABLE_TENNIS_MATCHES_KEY,
    queryFn: getTableTennisMatches,
    staleTime: 30 * 1000,
  });

  const matches = useMemo<TableTennisMatch[]>(() => matchesQuery.data ?? [], [matchesQuery.data]);

  const liveMatches = useMemo(() => matches.filter(m => m.status === 'live'), [matches]);
  const upcomingMatches = useMemo(() => matches.filter(m => m.status === 'upcoming'), [matches]);
  const completedMatches = useMemo(() => matches.filter(m => m.status === 'completed'), [matches]);

  const invalidate = useCallback(
    (id?: string) => {
      queryClient.invalidateQueries({ queryKey: TABLE_TENNIS_MATCHES_KEY });
      if (id) queryClient.invalidateQueries({ queryKey: tableTennisMatchKey(id) });
    },
    [queryClient],
  );

  const createMatch = useCallback(
    async (match: NewTableTennisMatch) => {
      const id = await createTableTennisMatch(match);
      invalidate();
      return id;
    },
    [invalidate],
  );

  /** Saves changes without refetching the open scorecard (it already holds the latest state). */
  const saveMatch = useCallback(
    async (id: string, update: TableTennisMatchUpdate) => {
      await updateTableTennisMatch(id, update);
      queryClient.invalidateQueries({ queryKey: TABLE_TENNIS_MATCHES_KEY });
    },
    [queryClient],
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      await deleteTableTennisMatch(id);
      queryClient.removeQueries({ queryKey: tableTennisMatchKey(id) });
      invalidate();
    },
    [invalidate, queryClient],
  );

  return {
    matches,
    liveMatches,
    upcomingMatches,
    completedMatches,
    isLoading: matchesQuery.isLoading,
    error: matchesQuery.error,
    refetch: matchesQuery.refetch,
    createMatch,
    saveMatch,
    deleteMatch,
  };
});
