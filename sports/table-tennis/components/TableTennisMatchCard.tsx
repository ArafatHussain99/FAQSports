import Colors from '@/constants/colors';
import { useData } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { computeMatchState } from '../engines/scoreEngine';
import { TableTennisMatch } from '../types';
import { teamLabel } from '../utils';

const statusColor = {
  live: Colors.live,
  upcoming: Colors.upcoming,
  completed: Colors.completed,
  cancelled: Colors.cancelled,
} as const;

export default function TableTennisMatchCard({ match }: { match: TableTennisMatch }) {
  const router = useRouter();
  const { players } = useData();
  const state = computeMatchState(match, match.gameSetups, match.points);
  const showScore = match.status !== 'upcoming';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/table-tennis/match/${match.id}`)}
    >
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor[match.status] }]}>
          <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.meta}>
          {match.format === 'double' ? 'Doubles' : 'Singles'} · {match.bestOf === 1 ? '1 game' : `Best of ${match.bestOf}`} · to {match.pointsToWin}
          {match.venue ? ` · ${match.venue}` : ''}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.teams}>
          <View style={styles.teamRow}>
            <Text style={[styles.teamName, match.winner === 'A' && styles.winner]} numberOfLines={1}>
              {teamLabel(players, match.teamA)}
            </Text>
            {showScore && <Text style={[styles.games, match.winner === 'A' && styles.winner]}>{state.gamesWonA}</Text>}
          </View>
          <View style={styles.teamRow}>
            <Text style={[styles.teamName, match.winner === 'B' && styles.winner]} numberOfLines={1}>
              {teamLabel(players, match.teamB)}
            </Text>
            {showScore && <Text style={[styles.games, match.winner === 'B' && styles.winner]}>{state.gamesWonB}</Text>}
          </View>
          {match.status === 'live' && (
            <Text style={styles.liveScore}>
              Game {state.currentGame + 1}: {state.scoreA} - {state.scoreB}
            </Text>
          )}
        </View>
        <ChevronRight size={20} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.tableTennis,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.background,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teams: {
    flex: 1,
    gap: 4,
    marginRight: 8,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  games: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  winner: {
    color: Colors.primary,
  },
  liveScore: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.live,
  },
});
