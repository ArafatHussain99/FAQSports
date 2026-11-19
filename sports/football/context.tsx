import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useState } from 'react';
import { FootballMatch } from './types';

export const [FootballMatchProvider, useFootballMatches] = createContextHook(() => {
  const [liveMatch, setLiveMatch] = useState<FootballMatch | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<FootballMatch[]>([]);
  const [completedMatches, setCompletedMatches] = useState<FootballMatch[]>([]);
  const [currentMatch, setCurrentMatch] = useState<FootballMatch | null>(null);

  const startMatch = useCallback((match: FootballMatch) => {
    const updatedMatch = { ...match, status: 'live' as const, startedAt: new Date().toISOString() };
    setLiveMatch(updatedMatch);
    setCurrentMatch(updatedMatch);
    setUpcomingMatches(prev => prev.filter(m => m.id !== match.id));
  }, []);

  const updateLiveMatch = useCallback((match: FootballMatch) => {
    setLiveMatch(match);
    setCurrentMatch(match);
  }, []);

  const endMatch = useCallback((match: FootballMatch, winner: string, result: string) => {
    const completedMatch: FootballMatch = {
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
