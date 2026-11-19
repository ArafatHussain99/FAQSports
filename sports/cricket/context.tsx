import { mockCompletedMatches, mockLiveMatch, mockUpcomingMatches } from '@/mocks/data';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useState } from 'react';
import { CricketMatch } from './types';

export const [CricketMatchProvider, useCricketMatches] = createContextHook(() => {
  const [liveMatch, setLiveMatch] = useState<CricketMatch | null>(mockLiveMatch);
  const [upcomingMatches, setUpcomingMatches] = useState<CricketMatch[]>(mockUpcomingMatches);
  const [completedMatches, setCompletedMatches] = useState<CricketMatch[]>(mockCompletedMatches);
  const [currentMatch, setCurrentMatch] = useState<CricketMatch | null>(null);

  const startMatch = useCallback((match: CricketMatch) => {
    const updatedMatch = { ...match, status: 'live' as const, startedAt: new Date().toISOString() };
    setLiveMatch(updatedMatch);
    setCurrentMatch(updatedMatch);
    setUpcomingMatches(prev => prev.filter(m => m.id !== match.id));
  }, []);

  const updateLiveMatch = useCallback((match: CricketMatch) => {
    setLiveMatch(match);
    setCurrentMatch(match);
  }, []);

  const endMatch = useCallback((match: CricketMatch, winner: string, result: string) => {
    const completedMatch: CricketMatch = {
      ...match,
      status: 'completed',
      winner,
      result,
      completedAt: new Date().toISOString(),
    };
    setCompletedMatches(prev => [completedMatch, ...prev]);
    setLiveMatch(null);
    setCurrentMatch(null);
  }, []);

  return {
    liveMatch,
    upcomingMatches,
    completedMatches,
    currentMatch,
    setCurrentMatch,
    startMatch,
    updateLiveMatch,
    endMatch,
    setLiveMatch,
    setUpcomingMatches,
  };
});
