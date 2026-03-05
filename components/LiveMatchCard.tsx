import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Radio } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CricketMatch, CricketMatchType } from '@/types';
import { useData } from '@/context/AppContext';

interface Props {
  match: CricketMatch;
}

export default function LiveMatchCard({ match }: Props) {
  const router = useRouter();
  const { getTeamById } = useData();

  const teamA = getTeamById(match.teamA);
  const teamB = getTeamById(match.teamB);

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => { const pulse = Animated.loop(Animated.sequence([Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true, }), Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, }),])); pulse.start(); return () => pulse.stop(); }, [pulseAnim]); if (!teamA || !teamB) return null;

  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];

  const currentInnings = match.innings[match.currentInnings - 1];

  if (!teamA || !teamB) return null;

  // Calculate target if 2nd innings started
  const target =
    firstInnings && match.currentInnings === 2
      ? firstInnings.runs + 1
      : null;

  const runsNeeded =
    target && secondInnings
      ? target - secondInnings.runs
      : null;

  const matchTypes: { key: CricketMatchType; label: string }[] = [{ key: 'long', label: 'Long Pitch' }, { key: 'short', label: 'Short Pitch' },];

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/match/${match.id}`)}
      activeOpacity={0.8}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.liveContainer}>
          <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.matchType}>
          {matchTypes.find((t) => t.key === match.matchType)?.label} • {match.ground}
        </Text>
      </View>

      {/* TEAMS */}
      <View style={styles.teamsContainer}>

        {/* TEAM A */}
        <View style={styles.teamRow}>
          <View style={[styles.teamColor, { backgroundColor: teamA.color }]} />
          <Text style={styles.teamName}>{teamA.name}</Text>

          {firstInnings && (
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>
                {firstInnings.runs}/{firstInnings.wickets}
              </Text>
              <Text style={styles.overs}>
                ({firstInnings.overs}.{firstInnings.balls} ov)
              </Text>
            </View>
          )}

          {secondInnings && secondInnings.battingTeam === match.teamA && (
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>
                {secondInnings.runs}/{secondInnings.wickets}
              </Text>
              <Text style={styles.overs}>
                ({secondInnings.overs}.{secondInnings.balls} ov)
              </Text>
            </View>
          )}
        </View>

        {/* TEAM B */}
        <View style={styles.teamRow}>
          <View style={[styles.teamColor, { backgroundColor: teamB.color }]} />
          <Text style={styles.teamName}>{teamB.name}</Text>

          {secondInnings && (
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>
                {secondInnings.runs}/{secondInnings.wickets}
              </Text>
              <Text style={styles.overs}>
                ({secondInnings.overs}.{secondInnings.balls} ov)
              </Text>
            </View>
          )}

        </View>
      </View>

      {/* FOOTER */}
      {currentInnings && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CRR:{" "}
            {(
              currentInnings.runs /
              (currentInnings.overs + currentInnings.balls / 6 || 1)
            ).toFixed(2)}
          </Text>
          <Radio size={14} color={Colors.live} />
          <Text style={styles.footerText}>Tap to view scorecard</Text>
        </View>
      )}

      {/* TARGET TEXT */}
      {match.currentInnings === 2 && runsNeeded !== null && runsNeeded > 0 && (
        <View style={{ marginTop: 8, padding: 4, backgroundColor: Colors.upcoming + '15', borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ color: `${Colors.upcoming}`, fontWeight: "600" }}>
            {teamB.name} needs {runsNeeded} runs to win
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.live,
    shadowColor: Colors.live,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
    marginRight: 6,
  },
  liveText: {
    color: Colors.live,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  matchType: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  teamsContainer: {
    gap: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamColor: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  teamName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  overs: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
