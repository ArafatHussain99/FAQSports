import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Play } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useData, useApp } from '@/context/AppContext';
import { useCricketMatches } from '../context';
import { mockPlayers } from '@/mocks/data';
import { BatsmanScore, CricketInnings } from '../types';
import { matchTypes } from '../constants';

type TabType = 'scorecard' | 'info' | 'commentary';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useApp();
  const { liveMatch, upcomingMatches, completedMatches, setCurrentMatch } = useCricketMatches();
  const { getTeamById, getPlayerById } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('scorecard');

  const match = liveMatch?.id === id
    ? liveMatch
    : upcomingMatches.find(m => m.id === id) || completedMatches.find(m => m.id === id);

  if (!match) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Match Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Match not found</Text>
        </View>
      </View>
    );
  }

  const teamA = getTeamById(match.teamA);
  const teamB = getTeamById(match.teamB);

  let currentInnings = match.innings[match.currentInnings - 1];
  let previousInnings = match.innings[match.currentInnings - 1];

  if (match.currentInnings > 1) {
    currentInnings = match.innings[1];
    previousInnings = match.innings[0];
  }

  const statusColors = {
    upcoming: Colors.upcoming,
    live: Colors.live,
    completed: Colors.completed,
    cancelled: Colors.cancelled,
  };

  const isLive = match.status === 'live';
  const onSummary = isLive ? Colors.onHighlight : Colors.text;
  const onSummarySecondary = isLive ? Colors.onHighlight : Colors.textSecondary;

  const handleStartScoring = () => {
    setCurrentMatch({ ...match, status: 'live', startedAt: new Date().toISOString() });
    router.push('/cricket/live-scoring');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const searchPlayerInfo = (playerId: string | undefined) => {
    return mockPlayers.find((player) => { if (player.id === playerId) { return player } })?.name
  }

  const playersDidNotBat = (battingIds: string[], inningsBatsmen: BatsmanScore[]) => {

    const battedIds = inningsBatsmen.map(
      (batsman) => batsman.playerId
    );

    const didNotBatIds = battingIds.filter(
      (playerId) => !battedIds.includes(playerId)
    );

    return didNotBatIds.map((id) => getPlayerById(id)?.name).join(', ');
  }

  const dismissalText = (batsman: BatsmanScore) =>
    batsman.dismissalType === 'bowled'
      ? `b ${searchPlayerInfo(batsman.dismissedBy)}`
      : batsman.dismissalType === 'caught'
        ? batsman.caughtBy === batsman.dismissedBy
          ? `c & b ${searchPlayerInfo(batsman.dismissedBy)}`
          : `c ${searchPlayerInfo(batsman.caughtBy)} b ${searchPlayerInfo(batsman.dismissedBy)}`
        : batsman.dismissalType === 'retired'
          ? `Retired Hurt`
          : batsman.dismissalType === 'run_out'
            ? `run out (${searchPlayerInfo(batsman.runoutBy)})`
            : batsman.dismissalType === 'stumped'
              ? `st †${searchPlayerInfo(batsman.stumpedBy)} b ${searchPlayerInfo(batsman.dismissedBy)}`
              : '';

  // `retiredCountsAsOut`: the first innings treats retired batters as out, the second does not.
  const renderBatting = (innings: CricketInnings, retiredCountsAsOut: boolean) => (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.nameCol]}>Batter</Text>
        <Text style={[styles.headerCell, styles.numCol]}>R</Text>
        <Text style={[styles.headerCell, styles.numCol]}>B</Text>
        <Text style={[styles.headerCell, styles.numCol]}>4s</Text>
        <Text style={[styles.headerCell, styles.numCol]}>6s</Text>
        <Text style={[styles.headerCell, styles.numColWide]}>SR</Text>
      </View>
      {innings.batsmen.map((batsman) => {
        const player = getPlayerById(batsman.playerId);
        const out = batsman.isOut || (retiredCountsAsOut && batsman.dismissalType === 'retired');
        return (
          <TouchableOpacity
            key={batsman.playerId}
            style={[styles.tableRow, !out && styles.tableRowNotOut]}
            onPress={() => router.push(`/player/${batsman.playerId}`)}
            accessibilityRole="button"
            accessibilityLabel={`${player?.name ?? 'Player'}, ${batsman.runs} off ${batsman.balls}${out ? '' : ', not out'}`}
          >
            <View style={styles.nameCol}>
              <Text style={styles.playerName} numberOfLines={1}>
                {player?.name}{!out ? ' *' : ''}
              </Text>
              {out ? (
                <Text style={styles.dismissalText} numberOfLines={2}>{dismissalText(batsman)}</Text>
              ) : (
                <Text style={styles.dismissalText}>not out</Text>
              )}
            </View>
            <Text style={[styles.numCell, styles.numCol, styles.numCellStrong]}>{batsman.runs}</Text>
            <Text style={[styles.numCell, styles.numCol]}>{batsman.balls}</Text>
            <Text style={[styles.numCell, styles.numCol]}>{batsman.fours}</Text>
            <Text style={[styles.numCell, styles.numCol]}>{batsman.sixes}</Text>
            <Text style={[styles.numCell, styles.numColWide]}>{batsman.strikeRate.toFixed(1)}</Text>
          </TouchableOpacity>
        );
      })}
      <View style={styles.tableRow}>
        <Text style={[styles.nameCol, styles.boldLabel]}>Extras</Text>
        <Text style={styles.extrasDetail} numberOfLines={1}>
          wd {innings.extras.wides}, nb {innings.extras.noBalls}, b {innings.extras.byes}, lb {innings.extras.legByes}
        </Text>
        <Text style={[styles.numCell, styles.numCellStrong, styles.numCol]}>{innings.extras.total}</Text>
      </View>
      <View style={[styles.tableRow, styles.tableRowLast]}>
        <Text style={[styles.nameCol, styles.boldLabel]}>Total</Text>
        <Text style={styles.extrasDetail} numberOfLines={1}>
          {innings.overs}.{innings.balls} ov
        </Text>
        <Text style={[styles.numCell, styles.numCellStrong]}>
          {innings.runs}/{innings.wickets}
        </Text>
      </View>
    </View>
  );

  const renderBowling = (innings: CricketInnings) => (
    <View style={[styles.table, styles.tableSpaced]}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.nameCol]}>Bowler</Text>
        <Text style={[styles.headerCell, styles.numCol]}>O</Text>
        <Text style={[styles.headerCell, styles.numCol]}>M</Text>
        <Text style={[styles.headerCell, styles.numCol]}>R</Text>
        <Text style={[styles.headerCell, styles.numCol]}>W</Text>
        <Text style={[styles.headerCell, styles.numColWide]}>Econ</Text>
      </View>
      {innings.bowlers.map((bowler) => {
        const player = getPlayerById(bowler.playerId);
        if (bowler.overs !== 0 || bowler.runs !== 0) {
          return (
            <TouchableOpacity
              key={bowler.playerId}
              style={styles.tableRow}
              onPress={() => router.push(`/player/${bowler.playerId}`)}
              accessibilityRole="button"
              accessibilityLabel={`${player?.name ?? 'Player'}, ${bowler.wickets} for ${bowler.runs}`}
            >
              <Text style={[styles.playerName, styles.nameCol]} numberOfLines={1}>{player?.name}</Text>
              <Text style={[styles.numCell, styles.numCol]}>{bowler.overs}.{bowler.balls}</Text>
              <Text style={[styles.numCell, styles.numCol]}>{bowler.maidens}</Text>
              <Text style={[styles.numCell, styles.numCol]}>{bowler.runs}</Text>
              <Text style={[styles.numCell, styles.numCol, styles.numCellStrong]}>{bowler.wickets}</Text>
              <Text style={[styles.numCell, styles.numColWide]}>{bowler.economy.toFixed(1)}</Text>
            </TouchableOpacity>
          );
        }
        return null;
      })}
    </View>
  );

  const renderNotes = (innings: CricketInnings, battingIds: string[]) => {
    const yetToBat = playersDidNotBat(battingIds, innings.batsmen);
    const fow = innings.fallOfWickets
      .map((wicket) => `${wicket.wicketNumber}-${wicket.runs} (${getPlayerById(wicket.playerId)?.name}, ${wicket.overs} ov)`)
      .join(', ');
    return (
      <View style={styles.notes}>
        <Text style={styles.noteText}>
          <Text style={styles.noteLabel}>Yet to bat  </Text>
          {yetToBat || '—'}
        </Text>
        <Text style={styles.noteText}>
          <Text style={styles.noteLabel}>Fall of wickets  </Text>
          {fow || '—'}
        </Text>
      </View>
    );
  };

  const renderYetToBowl = (innings: CricketInnings) => {
    const names = innings.bowlers
      .filter((bowler) => bowler.balls === 0 && bowler.overs === 0)
      .map((bowler) => getPlayerById(bowler.playerId)?.name)
      .join(', ');
    return (
      <View style={styles.notes}>
        <Text style={styles.noteText}>
          <Text style={styles.noteLabel}>Yet to bowl  </Text>
          {names || '—'}
        </Text>
      </View>
    );
  };

  const summaryRows = [
    { team: teamA, innings: match.innings[0], batting: match.currentInnings === 1 },
    { team: teamB, innings: match.innings[1], batting: match.currentInnings === 2 },
  ];

  const xiSections = [
    { team: teamA, ids: match.playingXI_A },
    { team: teamB, ids: match.playingXI_B },
  ];

  const infoRows = [
    { label: 'Date', value: formatDate(match.createdAt) },
    { label: 'Venue', value: match.ground },
    { label: 'Format', value: `${matchTypes.find((t) => t.key === match.matchType)?.label} - ${match.totalOvers} overs` },
    ...(match.tossWinner
      ? [{ label: 'Toss', value: `${getTeamById(match.tossWinner)?.name} won the toss and elected to ${match.tossDecision} first` }]
      : []),
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title: `${teamA?.shortName} vs ${teamB?.shortName}` }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.summary, isLive && styles.summaryLive]}>
          <View style={[styles.statusTag, { borderColor: statusColors[match.status] }]}>
            <Text style={[styles.statusText, { color: statusColors[match.status] }]}>
              {match.status.toUpperCase()}
            </Text>
          </View>

          {summaryRows.map(({ team, innings, batting }, index) => (
            <View key={team?.id ?? index} style={styles.summaryRow}>
              <View style={[styles.pin, { backgroundColor: team?.color }]} />
              <Text
                style={[batting ? styles.summaryTeamCurrent : styles.summaryTeam, { color: onSummary }]}
                numberOfLines={1}
              >
                {team?.name}
              </Text>
              {innings ? (
                <Text style={[batting ? styles.scoreCurrent : styles.score, { color: onSummary }]}>
                  {innings.runs}/{innings.wickets}
                  <Text style={[styles.summaryOvers, { color: onSummarySecondary }]}>  {innings.overs}.{innings.balls}</Text>
                </Text>
              ) : (
                <Text style={[styles.summaryYetToBat, { color: onSummarySecondary }]}>Yet to bat</Text>
              )}
            </View>
          ))}

          {(!match.result && match.currentInnings === 2) && (
            <Text style={[styles.summaryLine, { color: onSummary }]}>
              {teamB?.name} needs {Math.abs(match.innings[match.currentInnings - 2].runs - match.innings[match.currentInnings - 1].runs + 1)} runs to win
            </Text>
          )}

          {match.result && (
            <Text style={[styles.summaryLine, styles.resultText]}>{match.result}</Text>
          )}
        </View>

        <View style={styles.segmentRow} accessibilityRole="tablist">
          {(['scorecard', 'info'] as TabType[]).map((tab) => {
            const selected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => setActiveTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'scorecard' && currentInnings && (
          <View style={styles.section}>
            <View style={styles.inningsHeading}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {match.currentInnings === 2 ? getTeamById(currentInnings.bowlingTeam)?.name : getTeamById(currentInnings.battingTeam)?.name}
              </Text>
              <Text style={styles.sectionSubTitle}>{match.totalOvers} ov maximum</Text>
            </View>

            {renderBatting(previousInnings, true)}
            {renderNotes(previousInnings, match.playingXI_A)}
            {renderBowling(previousInnings)}
            {renderYetToBowl(previousInnings)}

            {!match.innings[1] && (
              <View>
                <View style={styles.inningsHeading}>
                  <View style={[styles.pin, { backgroundColor: getTeamById(match.teamB)?.color }]} />
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {getTeamById(match.teamB)?.name} squad
                  </Text>
                </View>
                <Text style={styles.squadText}>
                  {match.playingXI_B.map((playerId) => {
                    const player = getPlayerById(playerId);
                    return `${player?.name}${getTeamById(match.teamB)?.captain === playerId ? ' (C)' : ''}`;
                  }).join(', ')}
                </Text>
              </View>
            )}

            {match.innings[1] && (
              <View>
                <View style={styles.inningsHeading}>
                  <Text style={styles.sectionTitle} numberOfLines={1}>
                    {getTeamById(currentInnings.battingTeam)?.name}
                  </Text>
                  <Text style={styles.sectionSubTitle}>
                    Target {match.innings[0].runs + 1} from {match.totalOvers} ov
                  </Text>
                </View>

                {renderBatting(match.innings[1], false)}
                {renderNotes(currentInnings, match.playingXI_B)}
                {renderBowling(currentInnings)}
                {renderYetToBowl(currentInnings)}
              </View>
            )}
          </View>
        )}

        {activeTab === 'info' && (
          <View style={styles.section}>
            <View style={styles.group}>
              {infoRows.map((row, index) => (
                <View
                  key={row.label}
                  style={[styles.infoRow, index === infoRows.length - 1 && styles.groupRowLast]}
                >
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            {match.playingXI_A.length > 0 && xiSections.map(({ team, ids }, sectionIndex) => (
              <View key={team?.id ?? sectionIndex}>
                <View style={styles.groupHeading}>
                  <View style={[styles.pin, { backgroundColor: team?.color }]} />
                  <Text style={styles.groupTitle} numberOfLines={1}>{team?.name} playing XI</Text>
                </View>
                <View style={styles.group}>
                  {ids.map((playerId, index) => {
                    const player = getPlayerById(playerId);
                    return (
                      <TouchableOpacity
                        key={playerId}
                        style={[styles.infoRow, index === ids.length - 1 && styles.groupRowLast]}
                        onPress={() => router.push(`/player/${playerId}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`${player?.name ?? 'Player'}, open profile`}
                      >
                        <Text style={styles.infoValueLeft} numberOfLines={1}>{player?.name}</Text>
                        <Text style={styles.infoLabelRight}>{player?.position}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {isAdmin && match.status === 'upcoming' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartScoring}>
            <Play size={20} color={Colors.onPrimary} fill={Colors.onPrimary} />
            <Text style={styles.startBtnText}>Start Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && match.status === 'live' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartScoring}>
            <Play size={20} color={Colors.onPrimary} fill={Colors.onPrimary} />
            <Text style={styles.startBtnText}>Continue Scoring</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const NUM_COL = 34;
const NUM_COL_WIDE = 48;

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
    ...Type.body,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Match summary
  summary: {
    marginHorizontal: Space.xl,
    marginTop: Space.lg,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.md,
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  summaryLive: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.highlight,
    borderRadius: Radius.xs,
  },
  statusTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm - 2,
    paddingVertical: Space.xxs,
    marginBottom: Space.sm,
  },
  statusText: {
    ...Type.tag,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: Space.sm,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  summaryTeam: {
    ...Type.bodyStrong,
    flex: 1,
  },
  summaryTeamCurrent: {
    ...Type.headline,
    flex: 1,
  },
  score: {
    ...Type.scoreM,
  },
  scoreCurrent: {
    ...Type.scoreL,
  },
  summaryOvers: {
    ...Type.footnote,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  summaryYetToBat: {
    ...Type.footnote,
  },
  summaryLine: {
    ...Type.subhead,
    fontWeight: '600',
    marginTop: Space.sm,
    paddingTop: Space.sm,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  resultText: {
    color: Colors.completed,
  },

  // Scorecard / Info switch
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Space.xl,
    marginTop: Space.md,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -Hairline,
  },
  segmentSelected: {
    borderBottomColor: Colors.ink,
  },
  segmentText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: Colors.text,
  },

  section: {
    paddingHorizontal: Space.xl,
  },
  inningsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.section,
    marginBottom: Space.sm,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    flexShrink: 1,
  },
  sectionSubTitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },

  // Dense tables
  table: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableSpaced: {
    marginTop: Space.lg,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  headerCell: {
    ...Type.footnote,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  nameCol: {
    flex: 1,
    textAlign: 'left',
    paddingRight: Space.sm,
  },
  numCol: {
    width: NUM_COL,
  },
  numColWide: {
    width: NUM_COL_WIDE,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  tableRowNotOut: {
    backgroundColor: Colors.highlightSoft,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  playerName: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.text,
  },
  dismissalText: {
    ...Type.footnote,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  numCell: {
    ...Type.subhead,
    fontVariant: ['tabular-nums'],
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  numCellStrong: {
    fontWeight: '700',
    color: Colors.text,
  },
  boldLabel: {
    ...Type.subhead,
    fontWeight: '700',
    color: Colors.text,
    flex: 0,
    paddingRight: Space.sm,
  },
  extrasDetail: {
    ...Type.footnote,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    paddingRight: Space.sm,
  },
  notes: {
    paddingTop: Space.sm,
    gap: Space.xs,
  },
  noteText: {
    ...Type.footnote,
    fontWeight: '400',
    color: Colors.text,
  },
  noteLabel: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  squadText: {
    ...Type.subhead,
    color: Colors.text,
  },

  // Info: grouped list
  group: {
    marginTop: Space.lg,
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  groupHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.section,
    marginBottom: -Space.sm,
  },
  groupTitle: {
    ...Type.headline,
    color: Colors.text,
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: Touch,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  groupRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    ...Type.body,
    color: Colors.textSecondary,
    width: 72,
  },
  infoValue: {
    ...Type.bodyStrong,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  infoValueLeft: {
    ...Type.bodyStrong,
    color: Colors.text,
    flex: 1,
  },
  infoLabelRight: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    backgroundColor: Colors.surface,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Touch,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    gap: Space.sm,
  },
  startBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
});
