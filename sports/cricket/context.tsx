import { recordMatchStats } from '@/api/statsApi';
import { mockCompletedMatches, mockLiveMatch, mockUpcomingMatches } from '@/mocks/data';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { buildCricketStatLines, cricketMatchKey } from './matchStats';
import { CricketMatch } from './types';

export const [CricketMatchProvider, useCricketMatches] = createContextHook(() => {
  const queryClient = useQueryClient();
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

    // Save each player's line for this match. The database rolls it up into
    // player_stats, the team's history and records (highest score, best bowling).
    recordMatchStats('cricket', cricketMatchKey(completedMatch), buildCricketStatLines(completedMatch))
      .then(() => queryClient.invalidateQueries({ queryKey: ['players'] }))
      .catch(error => {
        console.error('Failed to save match stats:', error);
        Alert.alert(
          'Stats not saved',
          "The match ended, but player stats couldn't be saved. Check your connection and admin access."
        );
      });
  }, [queryClient]);

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
