import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Users, Trophy, TrendingUp, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/context/AppContext';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTeamById, getTeamPlayers, players } = useData();

  const team = getTeamById(id || '');
  const teamPlayers = getTeamPlayers(id || '');

  if (!team) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Team Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Team not found</Text>
        </View>
      </View>
    );
  }

  const captain = players.find(p => p.id === team.captain);
  const totalRuns = teamPlayers.reduce((sum, p) => sum + p.stats.runs, 0);
  const totalWickets = teamPlayers.reduce((sum, p) => sum + p.stats.wickets, 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: team.name }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
            <Text style={styles.teamInitials}>{team.shortName}</Text>
          </View>
          <Text style={styles.teamName}>{team.name}</Text>
          {captain && (
            <TouchableOpacity
              style={styles.captainBadge}
              onPress={() => router.push(`/player/${captain.id}`)}
            >
              <Text style={styles.captainLabel}>Captain:</Text>
              <Text style={styles.captainName}>{captain.name}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Users size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{teamPlayers.length}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy size={24} color={Colors.secondary} />
            <Text style={styles.statValue}>{totalRuns}</Text>
            <Text style={styles.statLabel}>Total Runs</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{totalWickets}</Text>
            <Text style={styles.statLabel}>Wickets</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Squad ({teamPlayers.length})</Text>
          <View style={styles.playersList}>
            {teamPlayers.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={styles.playerCard}
                onPress={() => router.push(`/player/${player.id}`)}
              >
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerInitial}>{player.name.charAt(0)}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {player.id === team.captain && (
                      <View style={styles.captainTag}>
                        <Text style={styles.captainTagText}>C</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerRole}>{player.position || 'Player'}</Text>
                </View>
                <View style={styles.playerStats}>
                  <Text style={styles.playerStatValue}>{player.stats.runs}</Text>
                  <Text style={styles.playerStatLabel}>runs</Text>
                </View>
                <View style={styles.playerStats}>
                  <Text style={styles.playerStatValue}>{player.stats.wickets}</Text>
                  <Text style={styles.playerStatLabel}>wkts</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingValue}>{player.ratings.overall}</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performers</Text>

          <View style={styles.performerCard}>
            <Text style={styles.performerTitle}>🏏 Top Run Scorer</Text>
            {teamPlayers.length > 0 && (
              <TouchableOpacity
                style={styles.performerRow}
                onPress={() => router.push(`/player/${[...teamPlayers].sort((a, b) => b.stats.runs - a.stats.runs)[0].id}`)}
              >
                <Text style={styles.performerName}>
                  {[...teamPlayers].sort((a, b) => b.stats.runs - a.stats.runs)[0].name}
                </Text>
                <Text style={styles.performerStat}>
                  {[...teamPlayers].sort((a, b) => b.stats.runs - a.stats.runs)[0].stats.runs} runs
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.performerCard}>
            <Text style={styles.performerTitle}>⚾ Top Wicket Taker</Text>
            {teamPlayers.length > 0 && (
              <TouchableOpacity
                style={styles.performerRow}
                onPress={() => router.push(`/player/${[...teamPlayers].sort((a, b) => b.stats.wickets - a.stats.wickets)[0].id}`)}
              >
                <Text style={styles.performerName}>
                  {[...teamPlayers].sort((a, b) => b.stats.wickets - a.stats.wickets)[0].name}
                </Text>
                <Text style={styles.performerStat}>
                  {[...teamPlayers].sort((a, b) => b.stats.wickets - a.stats.wickets)[0].stats.wickets} wickets
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.performerCard}>
            <Text style={styles.performerTitle}>🧤 Top Fielder</Text>
            {teamPlayers.length > 0 && (
              <TouchableOpacity
                style={styles.performerRow}
                onPress={() => router.push(`/player/${[...teamPlayers].sort((a, b) => b.stats.catches - a.stats.catches)[0].id}`)}
              >
                <Text style={styles.performerName}>
                  {[...teamPlayers].sort((a, b) => b.stats.catches - a.stats.catches)[0].name}
                </Text>
                <Text style={styles.performerStat}>
                  {[...teamPlayers].sort((a, b) => b.stats.catches - a.stats.catches)[0].stats.catches} catches
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  teamLogo: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  teamName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  captainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  captainLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginRight: 6,
  },
  captainName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  playersList: {
    gap: 10,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  captainTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  captainTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.background,
  },
  playerRole: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playerStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  playerStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  ratingBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.background,
  },
  performerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  performerTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  performerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  performerStat: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
