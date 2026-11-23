import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Plus, WifiOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { useCricketMatches } from '@/sports/cricket/context';
import { useFootballMatches } from '@/sports/football/context';
import { CricketMatch } from '@/sports/cricket/types';
import LiveMatchCard from '@/sports/cricket/components/LiveMatchCard';
import MatchCard from '@/sports/cricket/components/MatchCard';
import { useTableTennisMatches } from '@/sports/table-tennis/context';
import TableTennisMatchCard from '@/sports/table-tennis/components/TableTennisMatchCard';
import TournamentCard from '@/tournaments/components/TournamentCard';
import { useTournaments } from '@/tournaments/hooks';

const sports = [
  { id: 'cricket', name: 'Cricket', color: Colors.cricket },
  { id: 'football', name: 'Football', color: Colors.football },
  { id: 'table_tennis', name: 'Table Tennis', color: Colors.tableTennis },
  { id: 'badminton', name: 'Badminton', color: Colors.badminton },
  { id: 'carrom', name: 'Carrom', color: Colors.carrom },
  { id: 'uno', name: 'UNO', color: Colors.uno },
];

export default function HomeScreen() {
  const router = useRouter();
  const { role, userName, isAdmin, isOnline, isInitialized, currentSport, setCurrentSport } = useApp();
  const { liveMatch, upcomingMatches, completedMatches } = useCricketMatches();
  const { liveMatch: liveFootballMatch, upcomingMatches: upcomingFootballMatches, completedMatches: completedFootballMatches } = useFootballMatches();
  const tableTennis = useTableTennisMatches();
  const { unreadCount, players, teams } = useData();
  const [refreshing, setRefreshing] = React.useState(false);
  const refetchTableTennis = tableTennis.refetch;
  const { ongoing: ongoingTournaments, refetch: refetchTournaments } = useTournaments();

  useEffect(() => {
    if (isInitialized && !role) {
      router.replace('/login');
    }
  }, [isInitialized, role, router]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.allSettled([refetchTableTennis(), refetchTournaments()]).finally(() => setRefreshing(false));
  }, [refetchTableTennis, refetchTournaments]);

  if (!isInitialized || !role) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </View>
    );
  }

  const getPlayerStat = (player: typeof players[0]) => {
    switch (currentSport) {
      case 'football':
        return player.stats.goals || 0;
      case 'table_tennis':
        return player.stats.ttWins || 0;
      case 'badminton':
      case 'carrom':
      case 'uno':
        return player.stats.wins || 0;
      default: // cricket
        return player.stats.runs || 0;
    }
  };

  const getStatLabel = () => {
    switch (currentSport) {
      case 'football':
        return 'goals';
      case 'table_tennis':
        return 'wins';
      case 'badminton':
      case 'carrom':
      case 'uno':
        return 'wins';
      default: // cricket
        return 'runs';
    }
  };

  const topPlayers = [...players]
    .sort((a, b) => getPlayerStat(b) - getPlayerStat(a))
    .slice(0, 3);

  // Get sport-specific data
  const currentLiveMatch = currentSport === 'cricket' ? liveMatch : currentSport === 'football' ? liveFootballMatch : null;
  const currentUpcomingMatches = currentSport === 'cricket' ? upcomingMatches : currentSport === 'football' ? upcomingFootballMatches : [];
  const currentCompletedMatches = currentSport === 'cricket' ? completedMatches : currentSport === 'football' ? completedFootballMatches : [];

  const matchCount = currentSport === 'table_tennis'
    ? tableTennis.matches.length
    : currentCompletedMatches.length + (currentLiveMatch ? 1 : 0) + currentUpcomingMatches.length;

  const sportLabel = currentSport.charAt(0).toUpperCase() + currentSport.slice(1).replace(/_/g, ' ');

  const stats = [
    { label: 'Matches', value: matchCount },
    { label: 'Teams', value: teams.length },
    { label: 'Players', value: players.length },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">FAQ Sports</Text>
            <Text style={styles.greeting} numberOfLines={1}>Hello, {userName}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.roleTag, { backgroundColor: isAdmin ? Colors.adminBadge : Colors.playerBadge }]}>
                <Text style={styles.roleText}>{isAdmin ? 'ADMIN' : 'PLAYER'}</Text>
              </View>
              {!isOnline && (
                <View style={styles.offlineTag}>
                  <WifiOff size={12} color={Colors.warning} />
                  <Text style={styles.offlineText}>OFFLINE</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push('/notification')}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          >
            <Bell size={22} color={Colors.text} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellCount}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.segmentScroll}
          contentContainerStyle={styles.segmentRow}
          accessibilityRole="tablist"
        >
          {sports.map((sport) => {
            const selected = currentSport === sport.id;
            return (
              <TouchableOpacity
                key={sport.id}
                style={[styles.segment, selected && styles.segmentSelected]}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={sport.name}
                onPress={() => {
                  if (['badminton', 'carrom', 'uno'].includes(sport.id)) {
                    Alert.alert('Coming Soon', 'This sport will be available soon!');
                  } else {
                    setCurrentSport(sport.id as any);
                  }
                }}
              >
                <View style={[styles.sportPin, { backgroundColor: sport.color }]} />
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
                  {sport.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {ongoingTournaments.some(t => t.sport === currentSport) && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>Ongoing tournament{ongoingTournaments.filter(t => t.sport === currentSport).length > 1 ? 's' : ''}</Text>
              <TouchableOpacity onPress={() => router.push('/tournaments')} hitSlop={12} accessibilityRole="link">
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {ongoingTournaments
              .filter(t => t.sport === currentSport)
              .map(t => <TournamentCard key={t.id} tournament={t} />)}
          </View>
        )}

        {currentLiveMatch && currentSport === 'cricket' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live now</Text>
            <LiveMatchCard match={currentLiveMatch as CricketMatch} />
          </View>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              if (currentSport === 'cricket') {
                router.push('/cricket/create-match');
              } else if (currentSport === 'football') {
                router.push('/football/create-match');
              } else if (currentSport === 'table_tennis') {
                router.push('/table-tennis/create-match');
              }
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Create ${sportLabel} match`}
          >
            <Plus size={20} color={Colors.onPrimary} />
            <Text style={styles.createBtnText} numberOfLines={1}>Create {sportLabel} match</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={[styles.statCell, index > 0 && styles.statCellDivided]}>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {currentUpcomingMatches.length > 0 && currentSport === 'cricket' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>Upcoming</Text>
              <TouchableOpacity onPress={() => router.push('/matches')} hitSlop={12} accessibilityRole="link">
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {currentUpcomingMatches.slice(0, 2).map((match) => (
              <MatchCard key={match.id} match={match as CricketMatch} />
            ))}
          </View>
        )}

        {currentCompletedMatches.length > 0 && currentSport === 'cricket' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleInline}>Recent results</Text>
              <TouchableOpacity onPress={() => router.push('/matches')} hitSlop={12} accessibilityRole="link">
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {currentCompletedMatches.slice(0, 2).map((match) => (
              <MatchCard key={match.id} match={match as CricketMatch} />
            ))}
          </View>
        )}

        {currentSport === 'table_tennis' && (
          <>
            {tableTennis.isLoading && (
              <Text style={styles.ttMessage}>Loading table tennis matches...</Text>
            )}
            {!!tableTennis.error && (
              <TouchableOpacity onPress={() => tableTennis.refetch()} accessibilityRole="button">
                <Text style={styles.ttMessage}>Couldn&apos;t load table tennis matches. Tap to retry.</Text>
              </TouchableOpacity>
            )}
            {!tableTennis.isLoading && !tableTennis.error && tableTennis.matches.length === 0 && (
              <Text style={styles.ttMessage}>
                No table tennis matches yet.{isAdmin ? ' Create one to start scoring.' : ''}
              </Text>
            )}
            {[
              { title: 'Live now', items: tableTennis.liveMatches },
              { title: 'Upcoming', items: tableTennis.upcomingMatches },
              { title: 'Recent results', items: tableTennis.completedMatches.slice(0, 5) },
            ]
              .filter(group => group.items.length > 0)
              .map(group => (
                <View key={group.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{group.title}</Text>
                  {group.items.map(match => (
                    <TableTennisMatchCard key={match.id} match={match} />
                  ))}
                </View>
              ))}
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleInline}>Top performers</Text>
            <TouchableOpacity onPress={() => router.push('/teams')} hitSlop={12} accessibilityRole="link">
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.performerList}>
            {topPlayers.map((player, index) => (
              <TouchableOpacity
                key={player.id}
                style={[styles.performerRow, index > 0 && styles.performerRowRuled]}
                onPress={() => router.push(`/player/${player.id}`)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. ${player.name}, ${getPlayerStat(player)} ${getStatLabel()}, rating ${player.ratings.overall}`}
              >
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{player.name.charAt(0)}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                  <Text style={styles.playerStat}>{getPlayerStat(player)} {getStatLabel()}</Text>
                </View>
                <View style={styles.rating}>
                  <Text style={styles.ratingValue}>{player.ratings.overall}</Text>
                  <Text style={styles.ratingLabel}>Rating</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Type.body,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  headerText: {
    flex: 1,
    marginRight: Space.md,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
  },
  greeting: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.sm,
  },
  roleTag: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xxs,
    borderRadius: Radius.sm,
  },
  roleText: {
    ...Type.tag,
    color: Colors.ink,
  },
  offlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    paddingHorizontal: Space.sm,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  offlineText: {
    ...Type.tag,
    color: Colors.warning,
  },
  bellBtn: {
    width: 44,
    height: 44,
    marginRight: -Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: Space.xs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.live,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellCount: {
    ...Type.tag,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
    color: Colors.textInverse,
  },
  segmentScroll: {
    flexGrow: 0,
    marginHorizontal: Space.xl,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  segmentRow: {
    gap: Space.xl,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + Space.xxs,
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentSelected: {
    borderBottomColor: Colors.ink,
  },
  sportPin: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: 100,
  },
  section: {
    marginTop: Space.section,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Space.sm,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginBottom: Space.sm,
  },
  sectionTitleInline: {
    ...Type.title,
    color: Colors.text,
  },
  seeAll: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.primary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    minHeight: Touch,
    marginTop: Space.lg,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  createBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Space.lg,
    paddingVertical: Space.md,
    borderTopWidth: Hairline,
    borderBottomWidth: Hairline,
    borderColor: Colors.border,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellDivided: {
    borderLeftWidth: Hairline,
    borderLeftColor: Colors.border,
  },
  statNumber: {
    ...Type.scoreM,
    color: Colors.text,
  },
  statLabel: {
    ...Type.caption,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  ttMessage: {
    ...Type.footnote,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Space.section,
  },
  performerList: {
    borderTopWidth: Hairline,
    borderBottomWidth: Hairline,
    borderColor: Colors.border,
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: Space.md,
  },
  performerRowRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  rank: {
    ...Type.number,
    width: 24,
    color: Colors.textSecondary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Space.md,
  },
  avatarInitial: {
    ...Type.headline,
    color: Colors.ink,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  playerStat: {
    ...Type.footnote,
    fontVariant: ['tabular-nums'],
    color: Colors.textSecondary,
  },
  rating: {
    alignItems: 'flex-end',
    marginLeft: Space.md,
  },
  ratingValue: {
    ...Type.scoreM,
    color: Colors.text,
  },
  ratingLabel: {
    ...Type.caption,
    color: Colors.textMuted,
  },
});
