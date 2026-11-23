import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { Hairline, Space, Type } from '@/constants/tokens';
import { useApp } from '@/context/AppContext';
import { useCricketMatches } from '@/sports/cricket/context';
import LiveMatchCard from '@/sports/cricket/components/LiveMatchCard';
import MatchCard from '@/sports/cricket/components/MatchCard';

type FilterType = 'all' | 'live' | 'upcoming' | 'completed';

export default function MatchesScreen() {
  const router = useRouter();
  const { isAdmin } = useApp();
  const { liveMatch, upcomingMatches, completedMatches } = useCricketMatches();
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

  const scheduleHint = isAdmin
    ? 'Tap + to schedule a match.'
    : 'Ask an admin to schedule a match.';

  const renderEmpty = (title: string, subtitle: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Matches</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/cricket/create-match')}
              accessibilityRole="button"
              accessibilityLabel="Create match"
            >
              <Plus size={22} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segmentRow} accessibilityRole="tablist">
          {filters.map((f) => {
            const selected = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => setFilter(f.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${f.label}, ${f.count}`}
              >
                <Text
                  style={[styles.segmentText, selected && styles.segmentTextSelected]}
                  numberOfLines={1}
                >
                  {f.label} <Text style={styles.segmentCount}>{f.count}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
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
        {(filter === 'all' || filter === 'live') && liveMatch && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live now</Text>
            <LiveMatchCard match={liveMatch} />
          </View>
        )}

        {(filter === 'all' || filter === 'upcoming') && upcomingMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </View>
        )}

        {(filter === 'all' || filter === 'completed') && completedMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </View>
        )}

        {filter === 'all' && !liveMatch && upcomingMatches.length === 0 && completedMatches.length === 0 &&
          renderEmpty('No matches yet', scheduleHint)}

        {filter === 'live' && !liveMatch &&
          renderEmpty('Nothing live right now', 'Pull down to refresh, or check the Upcoming tab for the next match.')}

        {filter === 'upcoming' && upcomingMatches.length === 0 &&
          renderEmpty('No upcoming matches', scheduleHint)}

        {filter === 'completed' && completedMatches.length === 0 &&
          renderEmpty('No completed matches', 'Results appear here once a match is finished.')}
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
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    marginRight: -Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Space.xl,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -Hairline,
  },
  segmentSelected: {
    borderBottomColor: Colors.ink,
  },
  segmentText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: Colors.text,
  },
  segmentCount: {
    fontVariant: ['tabular-nums'],
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingBottom: 100,
  },
  section: {
    marginTop: Space.section,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginBottom: Space.sm,
  },
  emptyState: {
    paddingTop: Space.section * 2,
    paddingHorizontal: Space.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Type.headline,
    color: Colors.text,
    marginBottom: Space.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Type.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
