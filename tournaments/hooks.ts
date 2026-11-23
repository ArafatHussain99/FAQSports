import { useData } from '@/context/AppContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getTournaments } from './api';
import { Tournament, TournamentEntry, TournamentSport } from './types';

export const TOURNAMENTS_KEY = ['tournaments'];

export const TOURNAMENT_SPORT_LABELS: Record<TournamentSport, string> = {
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
};

/** "Cricket", "Table Tennis · Doubles". */
export const tournamentKindLabel = (t: Pick<Tournament, 'sport' | 'format'>) => {
  const sport = TOURNAMENT_SPORT_LABELS[t.sport];
  if (t.sport !== 'table_tennis') return sport;
  return `${sport} · ${t.format === 'double' ? 'Doubles' : 'Singles'}`;
};

/** All tournaments, newest first, plus ongoing / archived splits. */
export function useTournaments() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: TOURNAMENTS_KEY,
    queryFn: getTournaments,
    staleTime: 60 * 1000,
  });

  const tournaments = useMemo(() => query.data ?? [], [query.data]);
  const ongoing = useMemo(() => tournaments.filter(t => t.status === 'live'), [tournaments]);
  const archived = useMemo(() => tournaments.filter(t => t.status === 'completed'), [tournaments]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: TOURNAMENTS_KEY }),
    [queryClient]
  );

  return { ...query, tournaments, ongoing, archived, invalidate };
}

/**
 * Display name for an entry. Team entries follow the team's current name
 * (archived teams included); table tennis entries use their own name.
 */
export function useEntryNames() {
  const { getTeamById, getPlayerById } = useData();

  const entryName = useCallback(
    (entry: TournamentEntry | undefined) => {
      if (!entry) return 'TBD';
      if (entry.teamId) return getTeamById(entry.teamId)?.name ?? entry.name;
      return entry.name;
    },
    [getTeamById]
  );

  /** "Alex & Sam" for a table tennis entry, '' for teams. */
  const entryPlayers = useCallback(
    (entry: TournamentEntry | undefined) =>
      entry && !entry.teamId
        ? entry.playerIds.map(id => getPlayerById(id)?.name ?? 'Unknown player').join(' & ')
        : '',
    [getPlayerById]
  );

  return { entryName, entryPlayers };
}
