import React, { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';
import { getMatchStatsForYear, PlayerMatchStatRow, StatSport } from '@/api/statsApi';
import { STAT_SPORT_LABELS } from '@/hooks/useSportAwards';

const SPORTS: StatSport[] = ['cricket', 'football', 'table_tennis'];
const LIMIT = 5;

type Board = { title: string; unit: string; value: (rows: PlayerMatchStatRow[]) => number };

/** Leaderboards per sport. Only finished, recorded matches count (player_match_stats). */
const BOARDS: Record<StatSport, Board[]> = {
  cricket: [
    { title: 'Most runs', unit: 'runs', value: rows => rows.reduce((s, r) => s + r.runs, 0) },
    { title: 'Most wickets', unit: 'wkts', value: rows => rows.reduce((s, r) => s + r.wickets, 0) },
    { title: 'Most catches', unit: 'catches', value: rows => rows.reduce((s, r) => s + r.catches, 0) },
  ],
  football: [
    { title: 'Top scorers', unit: 'goals', value: rows => rows.reduce((s, r) => s + r.goals, 0) },
    { title: 'Most assists', unit: 'assists', value: rows => rows.reduce((s, r) => s + r.assists, 0) },
    { title: 'Most wins', unit: 'wins', value: rows => rows.filter(r => r.won).length },
  ],
  table_tennis: [
    { title: 'Most wins', unit: 'wins', value: rows => rows.filter(r => r.won).length },
    { title: 'Most matches', unit: 'played', value: rows => rows.length },
  ],
};

/** Top performers for one calendar year, per sport. */
export default function LeaderboardsScreen() {
  const router = useRouter();
  const { getPlayerById } = useData();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [sport, setSport] = useState<StatSport>('cricket');

  const query = useQuery({
    queryKey: ['match-stats-year', year],
    queryFn: () => getMatchStatsForYear(year),
    staleTime: 5 * 60 * 1000,
  });

  const boards = useMemo(() => {
    const rows = (query.data ?? []).filter(r => r.sport === sport);
    const byPlayer = new Map<string, PlayerMatchStatRow[]>();
    rows.forEach(r => byPlayer.set(r.player_id, [...(byPlayer.get(r.player_id) ?? []), r]));
    return BOARDS[sport].map(board => ({
      ...board,
      leaders: [...byPlayer.entries()]
        .map(([playerId, lines]) => ({ playerId, value: board.value(lines), matches: lines.length }))
        .filter(l => l.value > 0)
        .sort((a, b) => b.value - a.value || a.matches - b.matches)
        .slice(0, LIMIT),
    }));
  }, [query.data, sport]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={Colors.primary} />}
    >
      <View style={styles.yearRow}>
        <TouchableOpacity
          style={styles.yearBtn}
          onPress={() => setYear(y => y - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous year"
        >
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.year} accessibilityRole="header">{year}</Text>
        <TouchableOpacity
          style={[styles.yearBtn, year >= thisYear && styles.disabled]}
          onPress={() => setYear(y => Math.min(thisYear, y + 1))}
          disabled={year >= thisYear}
          accessibilityRole="button"
          accessibilityLabel="Next year"
        >
          <ChevronRight size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {SPORTS.map(s => {
          const selected = sport === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.tab, selected && styles.tabSelected]}
              onPress={() => setSport(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{STAT_SPORT_LABELS[s]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {query.isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : query.isError ? (
        <TouchableOpacity style={styles.centered} onPress={() => query.refetch()} accessibilityRole="button">
          <Text style={styles.message}>Couldn&apos;t load the leaderboards. Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        boards.map(board => (
          <View key={board.title}>
            <Text style={styles.sectionTitle}>{board.title}</Text>
            {board.leaders.length === 0 ? (
              <Text style={styles.message}>No {STAT_SPORT_LABELS[sport].toLowerCase()} results recorded in {year}.</Text>
            ) : (
              <View style={styles.group}>
                {board.leaders.map((leader, i) => {
                  const player = getPlayerById(leader.playerId);
                  return (
                    <TouchableOpacity
                      key={leader.playerId}
                      style={[styles.row, i > 0 && styles.ruled]}
                      onPress={() => router.push(`/player/${leader.playerId}`)}
                      disabled={!player}
                      accessibilityRole="button"
                      accessibilityLabel={`${i + 1}. ${player?.name ?? 'Unknown player'}, ${leader.value} ${board.unit}`}
                    >
                      <Text style={styles.rank}>{i + 1}</Text>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarInitial}>{(player?.name ?? '?').charAt(0)}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.name} numberOfLines={1}>{player?.name ?? 'Unknown player'}</Text>
                        <Text style={styles.sub}>{leader.matches} match{leader.matches === 1 ? '' : 'es'}</Text>
                      </View>
                      <Text style={styles.value}>{leader.value}</Text>
                      <Text style={styles.unit}>{board.unit}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ))
      )}
      <Text style={styles.footnote}>Counts matches recorded in {year}. Tournament results entered by hand don&apos;t add player stats.</Text>
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
    paddingTop: Space.md,
    paddingBottom: 100,
  },
  flex: {
    flex: 1,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.lg,
  },
  yearBtn: {
    width: Touch,
    height: Touch,
    justifyContent: 'center',
    alignItems: 'center',
  },
  year: {
    ...Type.scoreM,
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: Space.sm,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -Hairline,
  },
  tabSelected: {
    borderBottomColor: Colors.ink,
  },
  tabText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  tabTextSelected: {
    fontWeight: '700',
    color: Colors.text,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Space.xxxl,
  },
  sectionTitle: {
    ...Type.headline,
    color: Colors.text,
    marginTop: Space.xl,
    marginBottom: Space.sm,
  },
  message: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  footnote: {
    ...Type.footnote,
    color: Colors.textMuted,
    marginTop: Space.xl,
  },
  group: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: 56,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  ruled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  rank: {
    ...Type.number,
    width: 20,
    color: Colors.textSecondary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Type.headline,
    color: Colors.ink,
  },
  name: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  sub: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  value: {
    ...Type.scoreM,
    color: Colors.text,
  },
  unit: {
    ...Type.caption,
    width: 52,
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.4,
  },
});
