import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useApp, useMatches } from '@/context/AppContext';
import LiveMatchCard from '@/components/LiveMatchCard';
import MatchCard from '@/components/MatchCard';

type FilterType = 'all' | 'live' | 'upcoming' | 'completed';

export default function MatchesScreen() {
  const router = useRouter();
  const { isAdmin } = useApp();
  const { liveMatch, upcomingMatches, completedMatches } = useMatches();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: (liveMatch ? 1 : 0) + upcomingMatches.length + completedMatches.length },
    { key: 'live', label: 'Live', count: liveMatch ? 1 : 0 },
    { key: 'upcoming', label: 'Upcoming', count: upcomingMatches.length },
    { key: 'completed', label: 'Completed', count: completedMatches.length },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Matches</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/create-match')}
            >
              <Plus size={20} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, filter === f.key && styles.filterCountTextActive]}>
                  {f.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
        {(filter === 'all' || filter === 'live') && liveMatch && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔴 Live Now</Text>
            <LiveMatchCard match={liveMatch} />
          </View>
        )}

        {(filter === 'all' || filter === 'upcoming') && upcomingMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Upcoming Matches</Text>
            <View style={styles.matchesContainer}>
              {upcomingMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </View>
          </View>
        )}

        {(filter === 'all' || filter === 'completed') && completedMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Completed Matches</Text>
            <View style={styles.matchesContainer}>
              {completedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </View>
          </View>
        )}

        {filter === 'live' && !liveMatch && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏏</Text>
            <Text style={styles.emptyTitle}>No Live Matches</Text>
            <Text style={styles.emptySubtitle}>Check back later or view upcoming matches</Text>
          </View>
        )}

        {filter === 'upcoming' && upcomingMatches.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No Upcoming Matches</Text>
            <Text style={styles.emptySubtitle}>Schedule a new match to get started</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.background,
  },
  filterCount: {
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterCountTextActive: {
    color: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  matchesContainer: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
