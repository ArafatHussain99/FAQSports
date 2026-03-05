import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, MapPin, Trophy } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { CricketMatch, CricketMatchType } from '@/types';
import { useData } from '@/context/AppContext';

interface Props {
  match: CricketMatch;
}

export default function MatchCard({ match }: Props) {
  const router = useRouter();
  const { getTeamById } = useData();
  const teamA = getTeamById(match.teamA);
  const teamB = getTeamById(match.teamB);

  const matchTypes: { key: CricketMatchType; label: string }[] = [
    { key: 'long', label: 'Long Pitch' },
    { key: 'short', label: 'Short Pitch' },
  ];

  if (!teamA || !teamB) return null;

  const statusColors = {
    upcoming: Colors.upcoming,
    live: Colors.live,
    completed: Colors.completed,
    cancelled: Colors.cancelled,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/match/${match.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColors[match.status]}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[match.status] }]} />
          <Text style={[styles.statusText, { color: statusColors[match.status] }]}>
            {match.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.matchType}>{matchTypes.find((eachMatch) => match.matchType === eachMatch.key)?.label}</Text>
      </View>

      <View style={styles.teamsContainer}>
        <View style={styles.team}>
          <View style={[styles.teamLogo, { backgroundColor: teamA.color }]}>
            <Text style={styles.teamInitial}>{teamA.shortName}</Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>{teamA.name}</Text>
          {match.status === 'completed' && match.innings[0] && (
            <Text style={styles.teamScore}>
              {match.innings[0].runs}/{match.innings[0].wickets}
            </Text>
          )}
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.team}>
          <View style={[styles.teamLogo, { backgroundColor: teamB.color }]}>
            <Text style={styles.teamInitial}>{teamB.shortName}</Text>
          </View>
          <Text style={styles.teamName} numberOfLines={1}>{teamB.name}</Text>
          {match.status === 'completed' && match.innings[1] && (
            <Text style={styles.teamScore}>
              {match.innings[1].runs}/{match.innings[1].wickets}
            </Text>
          )}
        </View>
      </View>

      {match.status === 'completed' && match.result && (
        <View style={styles.resultContainer}>
          <Trophy size={14} color={Colors.primary} />
          <Text style={styles.resultText}>{match.result}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Calendar size={14} color={Colors.textMuted} />
          <Text style={styles.footerText}>{formatDate(match.createdAt)}</Text>
        </View>
        <View style={styles.footerItem}>
          <MapPin size={14} color={Colors.textMuted} />
          <Text style={styles.footerText}>{match.ground}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  matchType: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  teamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInitial: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  teamName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  teamScore: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  vsContainer: {
    width: 40,
    alignItems: 'center',
  },
  vsText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
