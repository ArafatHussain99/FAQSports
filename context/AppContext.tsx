import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { UserRole, CricketMatch, Notification, Player, Team, SportType, FootballMatch } from '@/types';
import { mockPlayers, mockTeams, mockLiveMatch, mockUpcomingMatches, mockCompletedMatches, mockNotifications } from '@/mocks/data';

const ROLE_STORAGE_KEY = 'user_role';
const USER_NAME_KEY = 'user_name';
const CURRENT_SPORT_KEY = 'current_sport';

export const [AppProvider, useApp] = createContextHook(() => {

  const [isOnline, setIsOnline] = useState(true);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [userName, setUserNameState] = useState<string>('');
  const [currentSport, setCurrentSportState] = useState<SportType>('cricket');
  const [isInitialized, setIsInitialized] = useState(false);

  const initQuery = useQuery({
    queryKey: ['init'],
    queryFn: async () => {
      const storedRole = await AsyncStorage.getItem(ROLE_STORAGE_KEY);
      const storedName = await AsyncStorage.getItem(USER_NAME_KEY);
      const storedSport = (await AsyncStorage.getItem(CURRENT_SPORT_KEY)) as SportType | null;
      return { role: storedRole as UserRole | null, name: storedName || '', sport: storedSport || 'cricket' };
    },
  });

  useEffect(() => {
    if (initQuery.data) {
      setRoleState(initQuery.data.role);
      setUserNameState(initQuery.data.name);
      setCurrentSportState(initQuery.data.sport);
      setIsInitialized(true);
    }
  }, [initQuery.data]);

  const setRoleMutation = useMutation({
    mutationFn: async ({ role, name }: { role: UserRole; name: string }) => {
      await AsyncStorage.setItem(ROLE_STORAGE_KEY, role);
      await AsyncStorage.setItem(USER_NAME_KEY, name);
      return { role, name };
    },
    onSuccess: (data) => {
      setRoleState(data.role);
      setUserNameState(data.name);
    },
  });

  const setSportMutation = useMutation({
    mutationFn: async (sport: SportType) => {
      await AsyncStorage.setItem(CURRENT_SPORT_KEY, sport);
      return sport;
    },
    onSuccess: (sport) => {
      setCurrentSportState(sport);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(ROLE_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_NAME_KEY);
    },
    onSuccess: () => {
      setRoleState(null);
      setUserNameState('');
    },
  });

  const { mutate: setRoleMutate } = setRoleMutation;
  const setRole = useCallback((role: UserRole, name: string) => {
    setRoleMutate({ role, name });
  }, [setRoleMutate]);

  const { mutate: setSportMutate } = setSportMutation;
  const setCurrentSport = useCallback((sport: SportType) => {
    setSportMutate(sport);
  }, [setSportMutate]);

  const { mutate: logoutMutate } = logoutMutation;
  const logout = useCallback(() => {
    logoutMutate();
  }, [logoutMutate]);

  const isAdmin = role === 'admin';
  const isPlayer = role === 'player';

  return {
    role,
    userName,
    isAdmin,
    isPlayer,
    currentSport,
    setCurrentSport,
    isOnline,
    setIsOnline,
    setRole,
    logout,
    isInitialized,
    isLoading: initQuery.isLoading || setRoleMutation.isPending || setSportMutation.isPending,
  };
});

export const [MatchProvider, useMatches] = createContextHook(() => {
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

export const [DataProvider, useData] = createContextHook(() => {
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const getPlayerById = useCallback((id: string) => {
    return players.find(p => p.id === id);
  }, [players]);

  const getTeamById = useCallback((id: string) => {
    return teams.find(t => t.id === id);
  }, [teams]);

  const getTeamPlayers = useCallback((teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    return players.filter(p => team.players.includes(p.id));
  }, [teams, players]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const addPlayer = useCallback((player: Player) => {
    setPlayers(prev => [...prev, player]);
  }, []);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
  }, []);

  const addTeam = useCallback((team: Team) => {
    setTeams(prev => [...prev, team]);
  }, []);

  const updateTeam = useCallback((teamId: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...updates } : t));
  }, []);

  return {
    players,
    teams,
    notifications,
    getPlayerById,
    getTeamById,
    getTeamPlayers,
    markNotificationRead,
    unreadCount,
    addPlayer,
    updatePlayer,
    addTeam,
    updateTeam,
    setPlayers,
    setTeams,
  };
});
