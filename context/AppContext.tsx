import { getGrounds, getPlayers, getTeams } from '@/app/api/matchesApi';
import { mockCompletedMatches, mockLiveMatch, mockNotifications, mockPlayers, mockTeams, mockUpcomingMatches } from '@/mocks/data';
import { CricketMatch, FootballMatch, Notification, Player, SportType, Team, UserRole } from '@/types';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

const ROLE_STORAGE_KEY = 'user_role';
const USER_NAME_KEY = 'user_name';
const CURRENT_SPORT_KEY = 'current_sport';

export const [AppProvider, useApp] = createContextHook(() => {

  const [isOnline, setIsOnline] = useState(true);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [userName, setUserNameState] = useState<string>('');
  const [currentSport, setCurrentSportState] = useState<SportType>('cricket');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('Loading...');

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

  const { mutateAsync: setRoleAsync } = setRoleMutation;
  const setRole = useCallback(async (role: UserRole, name: string) => {
    return setRoleAsync({ role, name });
  }, [setRoleAsync]);

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

  const setGlobalLoading = useCallback((loading: boolean, message = 'Loading...') => {
    setIsGlobalLoading(loading);
    setGlobalLoadingMessage(message);
  }, []);

  const runWithGlobalLoading = useCallback(async <T,>(task: () => Promise<T> | T, message = 'Loading...') => {
    setGlobalLoading(true, message);
    try {
      return await task();
    } finally {
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

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
    isGlobalLoading,
    globalLoadingMessage,
    setGlobalLoading,
    runWithGlobalLoading,
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
  const [grounds, setGrounds] = useState<string[]>([]);

  // Fetch data from Supabase on initialization
  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      try {
        const data = await getTeams();
        setTeams(data);
        return data;
      } catch (error) {
        console.error("Failed to fetch teams, using mock data:", error);
        return mockTeams;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const playersQuery = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      try {
        const data = await getPlayers();
        setPlayers(data);
        return data;
      } catch (error) {
        console.error("Failed to fetch players, using mock data:", error);
        return mockPlayers;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const groundsQuery = useQuery({
    queryKey: ['grounds'],
    queryFn: async () => {
      try {
        const data = await getGrounds();
        setGrounds(data);
        return data;
      } catch (error) {
        console.error("Failed to fetch grounds:", error);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const getPlayerById = useCallback((id: string) => {
    return players.find(p => p.id === id);
  }, [players]);

  const getTeamById = useCallback((id: string) => {
    return teams.find(t => t.id === id);
  }, [teams]);

  const getTeamPlayers = useCallback((teamId: string) => {
    return players.filter(p => p.teamId === teamId);
  }, [teams, players]);

  const refetchTeams = useCallback(() => {
    return teamsQuery.refetch();
  }, [teamsQuery]);

  const refetchPlayers = useCallback(() => {
    return playersQuery.refetch();
  }, [playersQuery]);

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

  const deleteTeam = useCallback((teamId: string) => {
    // Remove team from teams list
    setTeams(prev => prev.filter(t => t.id !== teamId));
    // Remove teamId from all players in that team
    setPlayers(prev => prev.map(p => p.teamId === teamId ? { ...p, teamId: undefined } : p));
  }, []);

  const deletePlayer = useCallback((playerId: string) => {
    // Remove player from players list
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  return {
    players,
    teams,
    notifications,
    grounds,
    getPlayerById,
    getTeamById,
    getTeamPlayers,
    refetchTeams,
    refetchPlayers,
    markNotificationRead,
    unreadCount,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addTeam,
    updateTeam,
    deleteTeam,
    setPlayers,
    setTeams,
    setGrounds,
    isLoadingData: teamsQuery.isLoading || playersQuery.isLoading,
  };
});
