import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Type } from '@/constants/tokens';
import { useRouter } from 'expo-router';
import { ChevronRight, Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { tournamentKindLabel, useEntryNames } from '../hooks';
import { computeStandings } from '../standings';
import { Tournament } from '../types';

const SPORT_COLOR = {
  cricket: Colors.cricket,
  football: Colors.football,
  table_tennis: Colors.tableTennis,
} as const;

/** Tournament summary: progress and leader (ongoing) or champion (archived). Taps open the tournament. */
export default function TournamentCard({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const { entryName } = useEntryNames();
  const isLive = tournament.status === 'live';

  const { played, total, leader } = useMemo(() => {
    const done = tournament.matches.filter(m => m.status === 'completed').length;
    const standings = computeStandings(tournament);
    const top = standings.rows[0];
    return {
      played: done,
      total: tournament.matches.length,
      leader: top && top.played > 0 ? tournament.entries.find(e => e.id === top.entryId) : undefined,
    };
  }, [tournament]);

  const champion = tournament.entries.find(e => e.id === tournament.winnerEntryId);

  const detail = isLive
    ? leader
      ? `Leader: ${entryName(leader)}`
      : 'No results yet'
    : champion
      ? `Champion: ${entryName(champion)}`
      : 'Finished';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tournaments/${tournament.id}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${tournament.name}, ${tournamentKindLabel(tournament)}, ${detail}`}
    >
      <View style={[styles.pin, { backgroundColor: SPORT_COLOR[tournament.sport] }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.kind} numberOfLines={1}>{tournamentKindLabel(tournament).toUpperCase()}</Text>
          {isLive ? (
            <View style={styles.liveTag}>
              <Text style={styles.liveTagText}>ONGOING</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>{tournament.name}</Text>
        <View style={styles.metaRow}>
          {!isLive && champion ? <Trophy size={14} color={Colors.gold} /> : null}
          <Text style={styles.meta} numberOfLines={1}>{detail}</Text>
        </View>
        {isLive ? (
          <Text style={styles.progress}>
            {played} of {total} matches played · {tournament.entries.length} teams
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.lg,
    marginBottom: Space.md,
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
  },
  pin: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: Space.xs,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  kind: {
    ...Type.tag,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  liveTag: {
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    backgroundColor: Colors.highlight,
  },
  liveTagText: {
    ...Type.tag,
    color: Colors.onHighlight,
  },
  name: {
    ...Type.headline,
    color: Colors.text,
    marginTop: Space.xxs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    marginTop: Space.xxs,
  },
  meta: {
    ...Type.subhead,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  progress: {
    ...Type.footnote,
    fontVariant: ['tabular-nums'],
    color: Colors.textMuted,
    marginTop: Space.xxs,
  },
});
