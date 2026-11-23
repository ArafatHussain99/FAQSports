import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
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

export default function LiveMatchCard({ match }: Props) {
  const router = useRouter();
  const { getTeamById } = useData();

  const teamA = getTeamById(match.teamA);
  const teamB = getTeamById(match.teamB);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!teamA || !teamB) return null;

  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];
  const currentInnings = match.innings[match.currentInnings - 1];

  // Calculate target if 2nd innings started
  const target = firstInnings && match.currentInnings === 2 ? firstInnings.runs + 1 : null;
  const runsNeeded = target && secondInnings ? target - secondInnings.runs : null;

  const crr = currentInnings
    ? (currentInnings.runs / (currentInnings.overs + currentInnings.balls / 6 || 1)).toFixed(2)
    : null;

  const rows = [
    { team: teamA, innings: firstInnings, batting: match.currentInnings === 1 },
    { team: teamB, innings: secondInnings, batting: match.currentInnings === 2 },
  ];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/cricket/match/${match.id}`)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Live: ${teamA.name} versus ${teamB.name}. Open scorecard`}
    >
      <View style={styles.header}>
        <View style={styles.liveTag}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {matchTypes.find((t) => t.key === match.matchType)?.label} · {match.ground}
        </Text>
      </View>

      {rows.map(({ team, innings, batting }) => (
        <View key={team.id} style={styles.teamRow}>
          <View style={[styles.pin, { backgroundColor: team.color }]} />
          <Text style={[styles.teamName, batting && styles.teamNameBatting]} numberOfLines={1}>
            {team.name}
          </Text>
          {innings ? (
            <Text style={batting ? styles.scoreBatting : styles.score}>
              {innings.runs}/{innings.wickets}
              <Text style={styles.overs}>  {innings.overs}.{innings.balls}</Text>
            </Text>
          ) : (
            <Text style={styles.yetToBat}>Yet to bat</Text>
          )}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {match.currentInnings === 2 && runsNeeded !== null && runsNeeded > 0
            ? `${teamB.name} need ${runsNeeded} to win`
            : crr !== null
              ? `Run rate ${crr}`
              : 'Scorecard'}
        </Text>
        <ChevronRight size={18} color={Colors.onHighlight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.highlight,
    borderRadius: Radius.xs,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
    marginBottom: Space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
    marginBottom: Space.xs,
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
    color: Colors.onHighlight,
    flexShrink: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: Space.sm,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    ...Type.bodyStrong,
    color: Colors.onHighlight,
    flex: 1,
  },
  teamNameBatting: {
    ...Type.headline,
  },
  score: {
    ...Type.scoreM,
    color: Colors.onHighlight,
  },
  scoreBatting: {
    ...Type.scoreL,
    color: Colors.onHighlight,
  },
  overs: {
    ...Type.footnote,
    letterSpacing: 0,
    color: Colors.onHighlight,
  },
  yetToBat: {
    ...Type.footnote,
    color: Colors.onHighlight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: Hairline,
    borderTopColor: Colors.onHighlight,
    marginTop: Space.xs,
    paddingTop: Space.sm,
    minHeight: 36,
  },
  footerText: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.onHighlight,
  },
});
