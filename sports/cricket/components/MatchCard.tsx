import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Type } from '@/constants/tokens';
import { CricketMatch, CricketMatchType } from '../types';
import { useData } from '@/context/AppContext';

interface Props {
  match: CricketMatch;
}

const matchTypes: { key: CricketMatchType; label: string }[] = [
  { key: 'long', label: 'Long Pitch' },
  { key: 'short', label: 'Short Pitch' },
];

const statusColors = {
  upcoming: Colors.upcoming,
  live: Colors.live,
  completed: Colors.completed,
  cancelled: Colors.cancelled,
};

const statusLabels = {
  upcoming: 'UPCOMING',
  live: 'LIVE',
  completed: 'RESULT',
  cancelled: 'CANCELLED',
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function MatchCard({ match }: Props) {
  const router = useRouter();
  const { getTeamById } = useData();
  const teamA = getTeamById(match.teamA);
  const teamB = getTeamById(match.teamB);

  if (!teamA || !teamB) return null;

  const statusColor = statusColors[match.status];
  const isCompleted = match.status === 'completed';
  const isCancelled = match.status === 'cancelled';

  const rows = [
    { team: teamA, innings: match.innings[0] },
    { team: teamB, innings: match.innings[1] },
  ];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/cricket/match/${match.id}`)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${teamA.name} versus ${teamB.name}, ${match.status}`}
    >
      <View style={styles.header}>
        <View style={[styles.statusTag, { borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabels[match.status]}</Text>
        </View>
        <Text style={styles.matchType}>
          {matchTypes.find((eachMatch) => match.matchType === eachMatch.key)?.label}
        </Text>
      </View>

      {rows.map(({ team, innings }) => (
        <View key={team.id} style={styles.teamRow}>
          <View style={[styles.pin, { backgroundColor: team.color }]} />
          <Text style={[styles.teamName, isCancelled && styles.struck]} numberOfLines={1}>
            {team.name}
          </Text>
          {isCompleted && innings && (
            <Text style={styles.teamScore}>
              {innings.runs}/{innings.wickets}
            </Text>
          )}
        </View>
      ))}

      {isCompleted && match.result && (
        <View style={styles.resultRow}>
          <Trophy size={14} color={Colors.completed} />
          <Text style={styles.resultText}>{match.result}</Text>
        </View>
      )}

      <Text style={styles.footerText} numberOfLines={1}>
        {formatDate(match.createdAt)} · {match.ground}
      </Text>
    </TouchableOpacity>
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
    marginBottom: Space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  matchType: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: 36,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    ...Type.bodyStrong,
    color: Colors.text,
    flex: 1,
  },
  struck: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  teamScore: {
    ...Type.scoreM,
    color: Colors.text,
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
});
