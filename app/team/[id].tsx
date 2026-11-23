import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { Player } from '@/types';
import { restoreTeam } from '@/api/teamApi';
import { getTeamMatchStats, totalsByPlayer } from '@/api/statsApi';

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, runWithGlobalLoading } = useApp();
  const { getTeamById, getTeamPlayers, getPlayerById, players, refetchTeams, refetchPlayers, isLoadingData } = useData();
  const [isRestoring, setIsRestoring] = useState(false);

  const team = getTeamById(id || '');
  const teamPlayers = getTeamPlayers(id || '');

  const historyQuery = useQuery({
    queryKey: ['team-match-stats', id],
    queryFn: () => getTeamMatchStats(id as string),
    enabled: !!id && !!team,
  });

  // Every player with recorded matches for this team, current and former, most runs first.
  const history = useMemo(
    () =>
      totalsByPlayer(historyQuery.data ?? []).sort(
        (a, b) => b.runs - a.runs || b.wickets - a.wickets || b.goals - a.goals || b.matches - a.matches
      ),
    [historyQuery.data]
  );

  const handleRestore = async () => {
    if (!team || isRestoring) return;
    setIsRestoring(true);
    try {
      await runWithGlobalLoading(async () => {
        await restoreTeam(team.id);
        await Promise.all([refetchTeams(), refetchPlayers()]);
      }, 'Restoring team...');
      Alert.alert('Success', `Team ${team.name} restored.`);
    } catch (error) {
      console.error('Error restoring team:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? `Failed to restore team: ${error.message}` : 'Failed to restore team. Please try again.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  if (!team && isLoadingData) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Team' }} />
        <View style={styles.errorContainer}>
          <ActivityIndicator color={Colors.textSecondary} />
        </View>
      </View>
    );
  }

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

  const isArchived = !!team.archivedAt;
  const captain = players.find(p => p.id === team.captain);
  const totalRuns = teamPlayers.reduce((sum, p) => sum + p.stats.runs, 0);
  const totalWickets = teamPlayers.reduce((sum, p) => sum + p.stats.wickets, 0);

  const topBy = (pick: (p: Player) => number) =>
    teamPlayers.length > 0 ? [...teamPlayers].sort((a, b) => pick(b) - pick(a))[0] : undefined;

  const performers = [
    { title: 'Top run scorer', player: topBy(p => p.stats.runs), value: (p: Player) => p.stats.runs, unit: 'runs' },
    { title: 'Top wicket taker', player: topBy(p => p.stats.wickets), value: (p: Player) => p.stats.wickets, unit: 'wickets' },
    { title: 'Top fielder', player: topBy(p => p.stats.catches), value: (p: Player) => p.stats.catches, unit: 'catches' },
  ];

  const summary = [
    { label: 'Players', value: teamPlayers.length },
    { label: 'Total runs', value: totalRuns },
    { label: 'Wickets', value: totalWickets },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title: team.name }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.teamPin, { backgroundColor: team.color }]} />
            <Text style={styles.teamName} numberOfLines={2}>{team.name}</Text>
            <View style={styles.shortTag}>
              <Text style={styles.shortTagText}>{team.shortName}</Text>
            </View>
          </View>
          <Text style={styles.sportLabel}>{team.sport === 'football' ? 'Football' : 'Cricket'} team</Text>
          {captain && (
            <TouchableOpacity
              style={styles.captainLink}
              onPress={() => router.push(`/player/${captain.id}`)}
              accessibilityRole="link"
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Text style={styles.captainLabel}>Captain</Text>
              <Text style={styles.captainName}>{captain.name}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isArchived && (
          <View style={styles.archivedBanner} accessibilityRole="summary">
            <Text style={styles.archivedBannerText}>
              Archived{formatDate(team.archivedAt) ? ` ${formatDate(team.archivedAt)}` : ''}. Players were removed from this team; its match history is kept.
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.outlineButton, isRestoring && styles.disabled]}
                onPress={handleRestore}
                disabled={isRestoring}
                accessibilityRole="button"
                accessibilityLabel={`Restore ${team.name}`}
              >
                <Text style={styles.outlineButtonText}>{isRestoring ? 'Restoring...' : 'Restore team'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.summary}>
          {summary.map((item, index) => (
            <View key={item.label} style={[styles.summaryCell, index > 0 && styles.summaryCellRuled]}>
              <Text style={styles.summaryValue}>{item.value}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Squad ({teamPlayers.length})</Text>
        {teamPlayers.length === 0 ? (
          <Text style={styles.emptyLine}>
            {isArchived ? 'No current players. This team is archived.' : 'No players in this team yet.'}
          </Text>
        ) : (
          <View style={styles.group}>
            {teamPlayers.map((player, index) => (
              <TouchableOpacity
                key={player.id}
                style={styles.row}
                onPress={() => router.push(`/player/${player.id}`)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{player.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={[styles.rowContent, index > 0 && styles.rowContentRuled]}>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameRow}>
                      <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
                      {player.id === team.captain && (
                        <View style={styles.captainTag} accessibilityLabel="Captain">
                          <Text style={styles.captainTagText}>C</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.playerRole}>{player.position || 'Player'}</Text>
                  </View>
                  <View style={styles.playerStat}>
                    <Text style={styles.playerStatValue}>{player.stats.runs}</Text>
                    <Text style={styles.playerStatLabel}>runs</Text>
                  </View>
                  <View style={styles.playerStat}>
                    <Text style={styles.playerStatValue}>{player.stats.wickets}</Text>
                    <Text style={styles.playerStatLabel}>wkts</Text>
                  </View>
                  <View style={styles.playerStat}>
                    <Text style={styles.playerStatValue}>{player.ratings.overall}</Text>
                    <Text style={styles.playerStatLabel}>rtg</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Team history</Text>
        {historyQuery.isPending && !historyQuery.isError ? (
          <View style={styles.historyState}>
            <ActivityIndicator color={Colors.textSecondary} />
          </View>
        ) : historyQuery.isError ? (
          <View style={styles.historyState}>
            <Text style={styles.emptyLine}>Couldn&apos;t load this team&apos;s match history.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => historyQuery.refetch()}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : history.length === 0 ? (
          <Text style={styles.emptyLine}>No matches recorded for this team yet.</Text>
        ) : (
          <View style={styles.group}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyHeaderText, styles.historyName]}>Player</Text>
              <Text style={[styles.historyHeaderText, styles.historyCell]}>M</Text>
              <Text style={[styles.historyHeaderText, styles.historyCell]}>Runs</Text>
              <Text style={[styles.historyHeaderText, styles.historyCell]}>Wkts</Text>
              <Text style={[styles.historyHeaderText, styles.historyCell]}>Goals</Text>
              <View style={styles.historyChevron} />
            </View>
            {history.map(row => {
              const player = getPlayerById(row.playerId);
              const isFormer =
                (team.sport === 'football' ? player?.footballTeamId : player?.teamId) !== team.id;
              const name = player?.name ?? 'Unknown player';
              return (
                <TouchableOpacity
                  key={row.playerId}
                  style={[styles.historyRow, styles.rowContentRuled]}
                  onPress={() => router.push(`/player/${row.playerId}`)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${name}${isFormer ? ', former player' : ''}, ${row.matches} matches, ${row.runs} runs, ${row.wickets} wickets, ${row.goals} goals`}
                >
                  <View style={[styles.historyName, styles.playerNameRow]}>
                    <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
                    {isFormer && (
                      <View style={styles.formerTag}>
                        <Text style={styles.formerTagText}>FORMER</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.playerStatValue, styles.historyCell]}>{row.matches}</Text>
                  <Text style={[styles.playerStatValue, styles.historyCell]}>{row.runs}</Text>
                  <Text style={[styles.playerStatValue, styles.historyCell]}>{row.wickets}</Text>
                  <Text style={[styles.playerStatValue, styles.historyCell]}>{row.goals}</Text>
                  <View style={styles.historyChevron}>
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Top performers</Text>
        <View style={styles.group}>
          {performers.map((performer, index) => {
            const top = performer.player;
            return (
              <TouchableOpacity
                key={performer.title}
                style={[styles.performerRow, index > 0 && styles.rowContentRuled]}
                onPress={top ? () => router.push(`/player/${top.id}`) : undefined}
                disabled={!top}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.playerInfo}>
                  <Text style={styles.performerTitle}>{performer.title}</Text>
                  <Text style={styles.performerName} numberOfLines={1}>
                    {top ? top.name : 'No players yet'}
                  </Text>
                </View>
                {top && (
                  <>
                    <Text style={styles.performerValue}>{performer.value(top)}</Text>
                    <Text style={styles.performerUnit}>{performer.unit}</Text>
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: Space.xl,
  },
  errorText: {
    ...Type.body,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingBottom: Space.xxxl,
  },
  header: {
    paddingTop: Space.xl,
    gap: Space.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  teamPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  teamName: {
    ...Type.title,
    color: Colors.text,
    flexShrink: 1,
  },
  shortTag: {
    borderWidth: 1,
    borderColor: Colors.ink,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: Space.xxs,
  },
  shortTagText: {
    ...Type.tag,
    color: Colors.ink,
  },
  sportLabel: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.xs,
  },
  captainLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    alignSelf: 'flex-start',
  },
  captainLabel: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  captainName: {
    ...Type.subhead,
    fontWeight: '700',
    color: Colors.primary,
  },
  archivedBanner: {
    marginTop: Space.lg,
    padding: Space.lg,
    gap: Space.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  archivedBannerText: {
    ...Type.subhead,
    color: Colors.text,
  },
  outlineButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: Space.lg,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
    borderRadius: Radius.md,
  },
  outlineButtonText: {
    ...Type.headline,
    color: Colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  historyState: {
    paddingVertical: Space.md,
    alignItems: 'flex-start',
    gap: Space.sm,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    ...Type.subhead,
    fontWeight: '700',
    color: Colors.primary,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.sm,
    paddingLeft: Space.lg,
    paddingRight: Space.md,
  },
  historyHeaderText: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: Touch + Space.xs,
    paddingVertical: Space.sm,
    paddingLeft: Space.lg,
    paddingRight: Space.md,
  },
  historyName: {
    flex: 1,
    minWidth: 0,
  },
  historyCell: {
    width: 40,
    textAlign: 'right',
  },
  historyChevron: {
    width: 20,
  },
  formerTag: {
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs,
    paddingVertical: 1,
  },
  formerTagText: {
    ...Type.tag,
    color: Colors.textSecondary,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginTop: Space.lg,
    overflow: 'hidden',
  },
  summaryCell: {
    flex: 1,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  summaryCellRuled: {
    borderLeftWidth: Hairline,
    borderLeftColor: Colors.border,
  },
  summaryValue: {
    ...Type.scoreM,
    color: Colors.text,
  },
  summaryLabel: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginTop: Space.section,
    marginBottom: Space.sm,
  },
  emptyLine: {
    ...Type.subhead,
    color: Colors.textSecondary,
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
    paddingLeft: Space.lg,
    gap: Space.md,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: 64,
    paddingVertical: Space.sm,
    paddingRight: Space.md,
  },
  rowContentRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Type.headline,
    color: Colors.ink,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
  },
  playerName: {
    ...Type.bodyStrong,
    color: Colors.text,
    flexShrink: 1,
  },
  captainTag: {
    backgroundColor: Colors.highlight,
    borderRadius: Radius.xs,
    paddingHorizontal: Space.xs + 1,
    paddingVertical: 1,
  },
  captainTagText: {
    ...Type.tag,
    color: Colors.onHighlight,
  },
  playerRole: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  playerStat: {
    alignItems: 'flex-end',
    minWidth: 32,
  },
  playerStatValue: {
    ...Type.number,
    color: Colors.text,
  },
  playerStatLabel: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: Touch + Space.md,
    paddingVertical: Space.sm,
    paddingLeft: Space.lg,
    paddingRight: Space.md,
  },
  performerTitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  performerName: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  performerValue: {
    ...Type.scoreM,
    color: Colors.text,
  },
  performerUnit: {
    ...Type.footnote,
    color: Colors.textSecondary,
    minWidth: 52,
  },
});
