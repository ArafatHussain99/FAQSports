import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { ChevronRight, Trophy } from 'lucide-react-native';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { computeMatchState } from '../engines/scoreEngine';
import { TableTennisMatch, TTSide } from '../types';
import { teamLabel } from '../utils';

const statusColor = {
  live: Colors.live,
  upcoming: Colors.upcoming,
  completed: Colors.completed,
  cancelled: Colors.cancelled,
} as const;

const statusLabel = {
  live: 'LIVE',
  upcoming: 'UPCOMING',
  completed: 'RESULT',
  cancelled: 'CANCELLED',
} as const;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TableTennisMatchCard({ match }: { match: TableTennisMatch }) {
  const router = useRouter();
  const { players } = useData();
  const state = computeMatchState(match, match.gameSetups, match.points);
  const isLive = match.status === 'live';
  const showScore = match.status !== 'upcoming';
  const isCancelled = match.status === 'cancelled';

  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (!isLive) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isLive, pulseAnim]);

  const nameA = teamLabel(players, match.teamA);
  const nameB = teamLabel(players, match.teamB);
  const meta = `${match.format === 'double' ? 'Doubles' : 'Singles'} · ${
    match.bestOf === 1 ? '1 game' : `Best of ${match.bestOf}`
  } · to ${match.pointsToWin}`;

  const rows: { side: TTSide; name: string; games: number; points: number }[] = [
    { side: 'A', name: nameA, games: state.gamesWonA, points: state.scoreA },
    { side: 'B', name: nameB, games: state.gamesWonB, points: state.scoreB },
  ];

  const footer = [formatDate(match.createdAt), match.venue].filter(Boolean).join(' · ');

  if (isLive) {
    return (
      <TouchableOpacity
        style={styles.liveContainer}
        activeOpacity={0.8}
        onPress={() => router.push(`/table-tennis/match/${match.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Live: ${nameA} versus ${nameB}. Open scorecard`}
      >
        <View style={styles.header}>
          <View style={styles.liveTag}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={[styles.meta, styles.onHighlight]} numberOfLines={1}>
            {meta}
          </Text>
        </View>

        {rows.map(row => {
          const serving = !state.matchOver && state.servingSide === row.side;
          return (
            <View key={row.side} style={styles.liveRow}>
              <Initial name={row.name} />
              <Text
                style={[styles.teamName, styles.onHighlight, serving && styles.teamNameServing]}
                numberOfLines={1}
              >
                {row.name}
              </Text>
              <Text style={styles.liveGames}>{row.games}</Text>
              <Text style={styles.livePoints}>{row.points}</Text>
            </View>
          );
        })}

        <View style={styles.liveFooter}>
          <Text style={styles.liveFooterText} numberOfLines={1}>
            Game {state.currentGame + 1}
            {match.venue ? ` · ${match.venue}` : ''}
          </Text>
          <ChevronRight size={18} color={Colors.onHighlight} />
        </View>
      </TouchableOpacity>
    );
  }

  const color = statusColor[match.status];

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={() => router.push(`/table-tennis/match/${match.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${nameA} versus ${nameB}, ${match.status}`}
    >
      <View style={styles.header}>
        <View style={[styles.statusTag, { borderColor: color }]}>
          <Text style={[styles.statusText, { color }]}>{statusLabel[match.status]}</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      {rows.map(row => (
        <View key={row.side} style={styles.teamRow}>
          <Initial name={row.name} />
          <Text
            style={[
              styles.teamName,
              match.winner === row.side && styles.teamNameWinner,
              isCancelled && styles.struck,
            ]}
            numberOfLines={1}
          >
            {row.name}
          </Text>
          {showScore && <Text style={styles.teamScore}>{row.games}</Text>}
        </View>
      ))}

      {match.status === 'completed' && match.winner && (
        <View style={styles.resultRow}>
          <Trophy size={14} color={Colors.completed} />
          <Text style={styles.resultText} numberOfLines={1}>
            {match.winner === 'A' ? nameA : nameB} won{' '}
            {Math.max(state.gamesWonA, state.gamesWonB)}-{Math.min(state.gamesWonA, state.gamesWonB)}
          </Text>
        </View>
      )}

      <Text style={styles.footerText} numberOfLines={1}>
        {footer}
      </Text>
    </TouchableOpacity>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <View style={styles.initial}>
      <Text style={styles.initialText}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  liveContainer: {
    backgroundColor: Colors.highlight,
    borderRadius: Radius.xs,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.xs,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
  },
  statusText: {
    ...Type.tag,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
  },
  liveText: {
    ...Type.tag,
    color: Colors.live,
  },
  meta: {
    ...Type.footnote,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  onHighlight: {
    color: Colors.onHighlight,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: 36,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: 44,
  },
  initial: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    ...Type.caption,
    color: Colors.ink,
  },
  teamName: {
    ...Type.bodyStrong,
    color: Colors.text,
    flex: 1,
  },
  teamNameServing: {
    ...Type.headline,
  },
  teamNameWinner: {
    fontWeight: '800',
  },
  struck: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  teamScore: {
    ...Type.scoreM,
    color: Colors.text,
  },
  liveGames: {
    ...Type.number,
    color: Colors.onHighlight,
    minWidth: 20,
    textAlign: 'right',
  },
  livePoints: {
    ...Type.scoreL,
    color: Colors.onHighlight,
    minWidth: 56,
    textAlign: 'right',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    marginTop: Space.xs,
  },
  resultText: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.completed,
    flex: 1,
  },
  footerText: {
    ...Type.footnote,
    color: Colors.textSecondary,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
    marginTop: Space.sm,
    paddingTop: Space.sm,
  },
  liveFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: Hairline,
    borderTopColor: Colors.onHighlight,
    marginTop: Space.xs,
    paddingTop: Space.sm,
    minHeight: 36,
  },
  liveFooterText: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.onHighlight,
    flexShrink: 1,
  },
});
