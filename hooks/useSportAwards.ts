import { getSportAwards, SportAward, StatSport } from '@/api/statsApi';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

export const SPORT_AWARDS_KEY = ['sport-awards'];

export const STAT_SPORT_LABELS: Record<StatSport, string> = {
  cricket: 'Cricket',
  football: 'Football',
  table_tennis: 'Table Tennis',
};

/** Current champion / runner-up per sport, and a lookup for one player's awards. */
export function useSportAwards() {
  const query = useQuery({
    queryKey: SPORT_AWARDS_KEY,
    queryFn: getSportAwards,
    staleTime: 5 * 60 * 1000,
  });

  const awards: SportAward[] = query.data ?? [];

  /** Awards this player holds, champion first. */
  const awardsForPlayer = useCallback(
    (playerId: string) =>
      awards
        .filter((a) => a.recipientIds.includes(playerId))
        .sort((a, b) => a.place - b.place),
    [awards]
  );

  return { ...query, awards, awardsForPlayer };
}
