import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Calendar, MapPin, Trophy, Play, Target } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMatches, useData, useApp } from '@/context/AppContext';
import { mockPlayers } from '@/mocks/data';
import { BatsmanScore } from '@/types';
import { getMatches } from '../api/matchesApi';
import { matchTypes } from '../create-match';

type TabType = 'scorecard' | 'info' | 'commentary';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useApp();
  const { liveMatch, upcomingMatches, completedMatches, setCurrentMatch } = useMatches();
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

  const handleStartScoring = () => {
    setCurrentMatch({ ...match, status: 'live', startedAt: new Date().toISOString() });
    router.push('/match/live-scoring');
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `${teamA?.shortName} vs ${teamB?.shortName}` }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColors[match.status]}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[match.status] }]} />
            <Text style={[styles.statusText, { color: statusColors[match.status] }]}>
              {match.status.toUpperCase()}
            </Text>
          </View>

          <View style={styles.teamsHeader}>
            <View style={styles.teamSection}>
              <View style={[styles.teamLogo, { backgroundColor: teamA?.color }]}>
                <Text style={styles.teamInitials}>{teamA?.shortName}</Text>
              </View>
              <Text style={styles.teamName}>{teamA?.name}</Text>
              {match.innings[0] && (
                <Text style={styles.teamScore}>
                  {match.innings[0].runs}/{match.innings[0].wickets}
                  <Text style={styles.oversText}> ({match.innings[0].overs}.{match.innings[0].balls})</Text>
                </Text>
              )}
            </View>

            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.teamSection}>
              <View style={[styles.teamLogo, { backgroundColor: teamB?.color }]}>
                <Text style={styles.teamInitials}>{teamB?.shortName}</Text>
              </View>
              <Text style={styles.teamName}>{teamB?.name}</Text>
              {match.innings[1] && (
                <Text style={styles.teamScore}>
                  {match.innings[1].runs}/{match.innings[1].wickets}
                  <Text style={styles.oversText}> ({match.innings[1].overs}.{match.innings[1].balls})</Text>
                </Text>
              )}
            </View>
          </View>

          {(!match.result && match.currentInnings === 2) && (
            <View style={styles.resultContainer}>
              <Target size={16} color={Colors.primary} />
              <Text style={styles.resultText}>{teamB?.name} needs {Math.abs(match.innings[match.currentInnings - 2].runs - match.innings[match.currentInnings - 1].runs + 1)} runs to win</Text>
            </View>
          )}

          {match.result && (
            <View style={styles.resultContainer}>
              <Trophy size={16} color={Colors.primary} />
              <Text style={styles.resultText}>{match.result}</Text>
            </View>
          )}
        </View>

        <View style={styles.tabsContainer}>
          {(['scorecard', 'info'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'scorecard' && currentInnings && (
          <View style={styles.section}>
            <View style={styles.sectionTitleHolder}>
              <Text style={styles.sectionTitle}>
                {match.currentInnings === 2 ? getTeamById(currentInnings.bowlingTeam)?.name : getTeamById(currentInnings.battingTeam)?.name}
              </Text>
              <Text style={styles.sectionSubTitle}>({match.totalOvers} ovs maximum)</Text>
            </View>

            <View style={styles.scorecardTable}>
              <View style={styles.scorecardHeader}>
                <Text style={[styles.headerCell, styles.cellBatsman]}>Batsman</Text>
                <Text style={styles.headerCell}>R</Text>
                <Text style={styles.headerCell}>B</Text>
                <Text style={styles.headerCell}>4s</Text>
                <Text style={styles.headerCell}>6s</Text>
                <Text style={styles.headerCell}>SR</Text>
              </View>
              {previousInnings.batsmen.map((batsman) => {
                const player = getPlayerById(batsman.playerId);
                return (
                  <TouchableOpacity
                    key={batsman.playerId}
                    style={styles.scorecardRow}
                    onPress={() => router.push(`/player/${batsman.playerId}`)}
                  >
                    <View style={[styles.cell, styles.cellBatsman]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {(!batsman.isOut && batsman.dismissalType !== 'retired') && (<View style={styles.notOutIndicator} />)}
                        <Text style={styles.playerName}>{player?.name}</Text>
                      </View>
                      {(batsman.isOut || batsman.dismissalType === 'retired') && (
                        <Text
                          style={styles.dismissalText}>{
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
                                      : ''
                          }
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.cell, styles.runsCell]}>{batsman.runs}</Text>
                    <Text style={styles.cell}>{batsman.balls}</Text>
                    <Text style={styles.cell}>{batsman.fours}</Text>
                    <Text style={styles.cell}>{batsman.sixes}</Text>
                    <Text style={styles.cell}>{batsman.strikeRate.toFixed(1)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.extrasRow}>
              <Text style={styles.extrasLabel}>Extras</Text>
              <Text style={styles.extrasValue}>
                {previousInnings.extras.total} (wd {previousInnings.extras.wides}, nb {previousInnings.extras.noBalls}, b {previousInnings.extras.byes}, lb {previousInnings.extras.legByes})
              </Text>
            </View>

            <View style={styles.yetToBatRow}>
              <Text style={styles.yetToBatLabel}>Yet to bat: </Text>
              {
                <Text style={styles.playerName}>{playersDidNotBat(match.playingXI_A, previousInnings.batsmen)}</Text>
              }
            </View>

            <View style={styles.yetToBatRow}>
              <Text style={styles.yetToBatLabel}>FoW: </Text>
              {previousInnings.fallOfWickets.map((wicket, index) => {
                return <View key={index} style={{ flexDirection: "row" }}>
                  <Text style={styles.playerName}>{wicket.wicketNumber}-{wicket.runs} ({getPlayerById(wicket.playerId)?.name}, {wicket.overs} ov)</Text>
                  {index !== previousInnings.batsmen.length - 1 && <Text style={styles.playerName}>, </Text>}
                </View>

              }
              )}
            </View>

            <View style={[styles.scorecardTable, { marginTop: 24 }]}>
              <View style={styles.scorecardHeader}>
                <Text style={[styles.headerCell, styles.cellBatsman]}>Bowler</Text>
                <Text style={styles.headerCell}>O</Text>
                <Text style={styles.headerCell}>M</Text>
                <Text style={styles.headerCell}>R</Text>
                <Text style={styles.headerCell}>W</Text>
                <Text style={styles.headerCell}>Eco</Text>
              </View>
              {previousInnings.bowlers.map((bowler) => {
                const player = getPlayerById(bowler.playerId);
                if (bowler.overs !== 0 || bowler.runs !== 0) {
                  return (
                    <TouchableOpacity
                      key={bowler.playerId}
                      style={styles.scorecardRow}
                      onPress={() => router.push(`/player/${bowler.playerId}`)}
                    >
                      <Text style={[styles.cell, styles.cellBatsman, styles.playerName]}>{player?.name}</Text>
                      <Text style={styles.cell}>{bowler.overs}.{bowler.balls}</Text>
                      <Text style={styles.cell}>{bowler.maidens}</Text>
                      <Text style={styles.cell}>{bowler.runs}</Text>
                      <Text style={[styles.cell, styles.wicketsCell]}>{bowler.wickets}</Text>
                      <Text style={styles.cell}>{bowler.economy.toFixed(1)}</Text>
                    </TouchableOpacity>
                  );
                }
              })}
            </View>

            <View style={styles.yetToBatRow}>
              <Text style={styles.yetToBatLabel}>Yet to ball: </Text>
              {previousInnings.bowlers.map((bowler, index) => {
                if (bowler.balls === 0 && bowler.overs === 0 && bowler.balls === 0) {
                  const player = getPlayerById(bowler.playerId);
                  return <View key={bowler.playerId} style={{ flexDirection: "row" }}>
                    <Text style={styles.playerName}>{player?.name}</Text>
                    {index !== previousInnings.batsmen.length - 1 && <Text style={styles.playerName}>, </Text>}
                  </View>
                }
              }
              )}
            </View>
            {
              !match.innings[1] &&
              <View>
                <View style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.textMuted, marginVertical: 20 }}></View>
                <Text style={[styles.sectionTitle, { marginBottom: 10 }]}><Text style={{ color: getTeamById(match.teamB)?.color }}>{getTeamById(match.teamB)?.name}</Text> starting squad:</Text>
                <View style={{ flexDirection: 'row', }}>{match.playingXI_B.map((playerId, index) => {
                  const player = getPlayerById(playerId);
                  return (
                    <Text key={playerId} style={styles.playerName}>
                      {player?.name}
                      {getTeamById(match.teamB)?.captain === playerId && ' (C)'}
                      {index < match.playingXI_B.length - 1 && <Text>, </Text>}
                    </Text>
                  );
                })}
                </View>
              </View>
            }
            {
              match.innings[1] &&
              <View>

                <View style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.textMuted, marginVertical: 20 }}></View>

                <View style={styles.sectionTitleHolder}>
                  <Text style={styles.sectionTitle}>
                    {getTeamById(currentInnings.battingTeam)?.name}
                  </Text>
                  <Text style={styles.sectionSubTitle}>(T: {match.innings[0].runs + 1} runs from {match.totalOvers} ovs)</Text>
                </View>

                <View style={styles.scorecardTable}>
                  <View style={styles.scorecardHeader}>
                    <Text style={[styles.headerCell, styles.cellBatsman]}>Batsman</Text>
                    <Text style={styles.headerCell}>R</Text>
                    <Text style={styles.headerCell}>B</Text>
                    <Text style={styles.headerCell}>4s</Text>
                    <Text style={styles.headerCell}>6s</Text>
                    <Text style={styles.headerCell}>SR</Text>
                  </View>
                  {match.innings[1].batsmen.map((batsman) => {
                    const player = getPlayerById(batsman.playerId);
                    return (
                      <TouchableOpacity
                        key={batsman.playerId}
                        style={styles.scorecardRow}
                        onPress={() => router.push(`/player/${batsman.playerId}`)}
                      >
                        <View style={[styles.cell, styles.cellBatsman]}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            {!batsman.isOut && (<View style={styles.notOutIndicator} />)}
                            <Text style={styles.playerName}>{player?.name}</Text>
                          </View>
                          {batsman.isOut && (
                            <Text
                              style={styles.dismissalText}>{
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
                                          : ''
                              }
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.cell, styles.runsCell]}>{batsman.runs}</Text>
                        <Text style={styles.cell}>{batsman.balls}</Text>
                        <Text style={styles.cell}>{batsman.fours}</Text>
                        <Text style={styles.cell}>{batsman.sixes}</Text>
                        <Text style={styles.cell}>{batsman.strikeRate.toFixed(1)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.extrasRow}>
                  <Text style={styles.extrasLabel}>Extras</Text>
                  <Text style={styles.extrasValue}>
                    {currentInnings.extras.total} (wd {currentInnings.extras.wides}, nb {currentInnings.extras.noBalls}, b {currentInnings.extras.byes}, lb {currentInnings.extras.legByes})
                  </Text>
                </View>

                <View style={styles.yetToBatRow}>
                  <Text style={styles.yetToBatLabel}>Yet to bat: </Text>
                  {
                    <Text style={styles.playerName}>{playersDidNotBat(match.playingXI_B, currentInnings.batsmen)}</Text>
                  }
                </View>

                <View style={styles.yetToBatRow}>
                  <Text style={styles.yetToBatLabel}>FoW: </Text>
                  {currentInnings.fallOfWickets.map((wicket, index) => {
                    return <View key={index} style={{ flexDirection: "row" }}>
                      <Text style={styles.playerName}>{wicket.wicketNumber}-{wicket.runs} ({getPlayerById(wicket.playerId)?.name}, {wicket.overs} ov)</Text>
                      {index !== currentInnings.fallOfWickets.length - 1 && <Text style={styles.playerName}>, </Text>}
                    </View>

                  }
                  )}
                </View>

                {/* <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              {getTeamById(currentInnings.bowlingTeam)?.name} Bowling
            </Text> */}

                <View style={[styles.scorecardTable, { marginTop: 24 }]}>
                  <View style={styles.scorecardHeader}>
                    <Text style={[styles.headerCell, styles.cellBatsman]}>Bowler</Text>
                    <Text style={styles.headerCell}>O</Text>
                    <Text style={styles.headerCell}>M</Text>
                    <Text style={styles.headerCell}>R</Text>
                    <Text style={styles.headerCell}>W</Text>
                    <Text style={styles.headerCell}>Eco</Text>
                  </View>
                  {currentInnings.bowlers.map((bowler) => {
                    const player = getPlayerById(bowler.playerId);
                    if (bowler.overs !== 0 || bowler.runs !== 0) {
                      return (
                        <TouchableOpacity
                          key={bowler.playerId}
                          style={styles.scorecardRow}
                          onPress={() => router.push(`/player/${bowler.playerId}`)}
                        >
                          <Text style={[styles.cell, styles.cellBatsman, styles.playerName]}>{player?.name}</Text>
                          <Text style={styles.cell}>{bowler.overs}.{bowler.balls}</Text>
                          <Text style={styles.cell}>{bowler.maidens}</Text>
                          <Text style={styles.cell}>{bowler.runs}</Text>
                          <Text style={[styles.cell, styles.wicketsCell]}>{bowler.wickets}</Text>
                          <Text style={styles.cell}>{bowler.economy.toFixed(1)}</Text>
                        </TouchableOpacity>
                      );
                    }
                  })}
                </View>

                <View style={styles.yetToBatRow}>
                  <Text style={styles.yetToBatLabel}>Yet to ball: </Text>
                  {currentInnings.bowlers.map((bowler, index) => {
                    if (bowler.balls === 0 && bowler.overs === 0 && bowler.balls === 0) {
                      const player = getPlayerById(bowler.playerId);
                      return <View key={bowler.playerId} style={{ flexDirection: "row" }}>
                        <Text style={styles.playerName}>{player?.name}</Text>
                        {index !== currentInnings.batsmen.length - 1 && <Text style={styles.playerName}>, </Text>}
                      </View>
                    }
                  }
                  )}
                </View>
              </View>
            }
          </View>


        )}

        {activeTab === 'info' && (
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Calendar size={18} color={Colors.textMuted} />
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(match.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <MapPin size={18} color={Colors.textMuted} />
                <Text style={styles.infoLabel}>Venue</Text>
                <Text style={styles.infoValue}>{match.ground}</Text>
              </View>
              <View style={styles.infoRow}>
                <Trophy size={18} color={Colors.textMuted} />
                <Text style={styles.infoLabel}>Format</Text>
                <Text style={styles.infoValue}>{matchTypes.find((t) => t.key === match.matchType)?.label} - {match.totalOvers} overs</Text>
              </View>
            </View>

            {match.tossWinner && (
              <View style={styles.tossCard}>
                <Text style={styles.tossTitle}>Toss</Text>
                <Text style={styles.tossText}>
                  {getTeamById(match.tossWinner)?.name} won the toss and elected to {match.tossDecision} first
                </Text>
              </View>
            )}

            {match.playingXI_A.length > 0 && (
              <>
                <Text style={styles.playingXITitle}>{teamA?.name} Playing XI</Text>
                <View style={styles.playingXIList}>
                  {match.playingXI_A.map((playerId) => {
                    const player = getPlayerById(playerId);
                    return (
                      <TouchableOpacity
                        key={playerId}
                        style={styles.playingXIItem}
                        onPress={() => router.push(`/player/${playerId}`)}
                      >
                        <Text style={styles.playingXIName}>{player?.name}</Text>
                        <Text style={styles.playingXIRole}>{player?.position}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.playingXITitle}>{teamB?.name} Playing XI</Text>
                <View style={styles.playingXIList}>
                  {match.playingXI_B.map((playerId) => {
                    const player = getPlayerById(playerId);
                    return (
                      <TouchableOpacity
                        key={playerId}
                        style={styles.playingXIItem}
                        onPress={() => router.push(`/player/${playerId}`)}
                      >
                        <Text style={styles.playingXIName}>{player?.name}</Text>
                        <Text style={styles.playingXIRole}>{player?.position}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {isAdmin && match.status === 'upcoming' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartScoring}>
            <Play size={20} color={Colors.background} fill={Colors.background} />
            <Text style={styles.startBtnText}>Start Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && match.status === 'live' && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStartScoring}>
            <Play size={20} color={Colors.background} fill={Colors.background} />
            <Text style={styles.startBtnText}>Continue Scoring</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 100,
  },
  header: {
    backgroundColor: Colors.card,
    padding: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  teamsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  teamInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  teamScore: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  oversText: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  vsContainer: {
    width: 50,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.background,
  },
  section: {
    padding: 16,
  },
  sectionTitleHolder: {
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    paddingRight: 8,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.cancelled,
    marginBottom: 12,
  },
  scorecardTable: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scorecardHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerCell: {
    width: 36,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
  },
  cellBatsman: {
    flex: 1,
    textAlign: 'left',
  },
  scorecardRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cell: {
    width: 36,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  notOutIndicator: {
    height: '100%',
    borderLeftWidth: 3,
    borderColor: Colors.primary,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  dismissalText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  runsCell: {
    fontWeight: '700',
    color: Colors.text,
  },
  wicketsCell: {
    fontWeight: '700',
    color: Colors.primary,
  },
  yetToBatRow: {
    padding: 12,
    paddingBottom: 0,
    flexDirection: "row"
  },
  yetToBatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  yetToBatValue: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  extrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  extrasLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  extrasValue: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  tossCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  tossTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  tossText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  playingXITitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
    marginTop: 8,
  },
  playingXIList: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  playingXIItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  playingXIName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  playingXIRole: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
});
