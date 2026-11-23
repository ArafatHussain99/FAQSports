import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TournamentCard from '../components/TournamentCard';
import { TOURNAMENT_SPORT_LABELS, useTournaments } from '../hooks';
import { TournamentSport } from '../types';

type Filter = 'all' | TournamentSport;
const FILTERS: Filter[] = ['all', 'cricket', 'football', 'table_tennis'];

/** All tournaments: ongoing first, then the archive of finished ones. */
export default function TournamentsScreen() {
  const router = useRouter();
  const { isAdmin } = useApp();
  const { ongoing, archived, isPending, isError, refetch, isRefetching } = useTournaments();
  const [filter, setFilter] = useState<Filter>('all');

  const visibleOngoing = useMemo(
    () => (filter === 'all' ? ongoing : ongoing.filter(t => t.sport === filter)),
    [ongoing, filter]
  );
  const visibleArchived = useMemo(
    () => (filter === 'all' ? archived : archived.filter(t => t.sport === filter)),
    [archived, filter]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map(f => {
          const selected = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {f === 'all' ? 'All sports' : TOURNAMENT_SPORT_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isAdmin && (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/tournaments/create')}
          accessibilityRole="button"
        >
          <Plus size={20} color={Colors.onPrimary} />
          <Text style={styles.createBtnText}>New tournament</Text>
        </TouchableOpacity>
      )}

      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.message}>Loading tournaments...</Text>
        </View>
      ) : isError ? (
        <TouchableOpacity style={styles.centered} onPress={() => refetch()} accessibilityRole="button">
          <Text style={styles.message}>Couldn&apos;t load tournaments. Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Ongoing</Text>
          {visibleOngoing.length === 0 ? (
            <Text style={styles.empty}>
              No ongoing tournaments.{isAdmin ? ' Start one with New tournament.' : ''}
            </Text>
          ) : (
            visibleOngoing.map(t => <TournamentCard key={t.id} tournament={t} />)
          )}

          <Text style={styles.sectionTitle}>Archived</Text>
          {visibleArchived.length === 0 ? (
            <Text style={styles.empty}>Finished tournaments will appear here with their results and stats.</Text>
          ) : (
            visibleArchived.map(t => <TournamentCard key={t.id} tournament={t} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: 100,
  },
  chips: {
    gap: Space.sm,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipSelected: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  chipText: {
    ...Type.subhead,
    color: Colors.text,
  },
  chipTextSelected: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    minHeight: Touch,
    marginTop: Space.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  createBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginTop: Space.section,
    marginBottom: Space.sm,
  },
  empty: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  centered: {
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.xxxl,
  },
  message: {
    ...Type.footnote,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
