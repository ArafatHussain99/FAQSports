import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Plus, WifiOff, ChevronRight, Trophy, Users, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp, useMatches, useData } from '@/context/AppContext';
import LiveMatchCard from '@/components/LiveMatchCard';
import MatchCard from '@/components/MatchCard';

const sportIcons = [
  { id: 'cricket', name: 'Cricket', emoji: '🏏', color: Colors.cricket },
  { id: 'football', name: 'Football', emoji: '⚽', color: Colors.football },
  { id: 'table_tennis', name: 'TT', emoji: '🏓', color: Colors.tableTennis },
  { id: 'badminton', name: 'Badminton', emoji: '🏸', color: Colors.badminton },
  { id: 'carrom', name: 'Carrom', emoji: '🎱', color: Colors.carrom },
  { id: 'uno', name: 'UNO', emoji: '🃏', color: Colors.uno },
];

export default function HomeScreen() {
  const router = useRouter();
  const { role, userName, isAdmin, isOnline, isInitialized } = useApp();
  const { liveMatch, upcomingMatches, completedMatches } = useMatches();
  const { unreadCount, players, teams } = useData();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (isInitialized && !role) {
      router.replace('/login');
    }
  }, [isInitialized, role, router]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!isInitialized || !role) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </View>
    );
  }

  const topPlayers = [...players]
    .sort((a, b) => b.stats.runs - a.stats.runs)
    .slice(0, 3);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}!</Text>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, { backgroundColor: isAdmin ? Colors.adminBadge : Colors.playerBadge }]}>
                <Text style={styles.roleText}>{isAdmin ? 'ADMIN' : 'PLAYER'}</Text>
              </View>
              {!isOnline && (
                <View style={styles.offlineBadge}>
                  <WifiOff size={12} color={Colors.warning} />
                  <Text style={styles.offlineText}>Offline</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => router.push('../notification')}
            >
              <Bell size={22} color={Colors.text} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.sportsContainer}>
          <Text style={styles.sectionTitle}>Sports</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
            {sportIcons.map((sport) => (
              <TouchableOpacity key={sport.id} style={styles.sportCard} activeOpacity={0.7}>
                <View style={[styles.sportIcon, { backgroundColor: `${sport.color}20` }]}>
                  <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                </View>
                <Text style={styles.sportName}>{sport.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.createMatchBtn}
            onPress={() => router.push('/create-match')}
            activeOpacity={0.8}
          >
            <View style={styles.createMatchContent}>
              <Plus size={24} color={Colors.text} />
              <View style={styles.createMatchText}>
                <Text style={styles.createMatchTitle}>Create New Match</Text>
                <Text style={styles.createMatchSubtitle}>Set up a cricket, football or other match</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {liveMatch && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Now</Text>
              <View style={styles.livePulse} />
            </View>
            <LiveMatchCard match={liveMatch} />
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Trophy size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{completedMatches.length + (liveMatch ? 1 : 0) + upcomingMatches.length}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={24} color={Colors.secondary} />
            <Text style={styles.statNumber}>{teams.length}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color={Colors.accent} />
            <Text style={styles.statNumber}>{players.length}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
        </View>

        {upcomingMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <TouchableOpacity onPress={() => router.push('/matches')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.matchesContainer}>
              {upcomingMatches.slice(0, 2).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            <TouchableOpacity onPress={() => router.push('/teams')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.topPlayersContainer}>
            {topPlayers.map((player, index) => (
              <TouchableOpacity
                key={player.id}
                style={styles.topPlayerCard}
                onPress={() => router.push(`/player/${player.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.rankBadge, index === 0 && styles.goldRank, index === 1 && styles.silverRank, index === 2 && styles.bronzeRank]}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerInitial}>{player.name.charAt(0)}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                  <Text style={styles.playerStat}>{player.stats.runs} runs</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingValue}>{player.ratings.overall}</Text>
                  <Text style={styles.ratingLabel}>Rating</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {completedMatches.length > 0 && (
          <View style={[styles.section, { marginBottom: 24 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Results</Text>
              <TouchableOpacity onPress={() => router.push('/matches')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.matchesContainer}>
              {completedMatches.slice(0, 2).map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </View>
          </View>
        )}
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
    color: Colors.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.warning}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.warning,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.live,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sportsContainer: {
    marginBottom: 20,
  },
  sportsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sportCard: {
    alignItems: 'center',
    width: 72,
  },
  sportIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sportEmoji: {
    fontSize: 28,
  },
  sportName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  createMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  createMatchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createMatchText: {
    gap: 2,
  },
  createMatchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  createMatchSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
    marginLeft: 8,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  matchesContainer: {
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  topPlayersContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  topPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goldRank: {
    backgroundColor: '#FFD700',
  },
  silverRank: {
    backgroundColor: '#C0C0C0',
  },
  bronzeRank: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  playerStat: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ratingContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  ratingLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
