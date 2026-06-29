import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData, useMatches } from '@/context/AppContext';
import { CricketMatch, CricketMatchType, TossDecision, Substitute } from '@/types';

type Step = 'basics' | 'teams' | 'toss' | 'players';

export const matchTypes: { key: CricketMatchType; label: string }[] = [
  { key: 'long', label: 'Long Pitch' },
  { key: 'short', label: 'Short Pitch' },
];

export default function CreateMatchScreen() {
  const router = useRouter();
  const { teams, players, getTeamPlayers, getTeamById, grounds } = useData();
  const { setUpcomingMatches, setCurrentMatch } = useMatches();

  const [step, setStep] = useState<Step>('basics');
  const [matchType, setMatchType] = useState<CricketMatchType>('long');
  const [totalOvers, setTotalOvers] = useState('10');
  const [totalPlayersEachSide, setTotalPlayersEachSide] = useState('7');
  const [selectedGround, setSelectedGround] = useState(grounds[0] || '');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<TossDecision>('bat');
  const [playingXI_A, setPlayingXI_A] = useState<string[]>([]);
  const [playingXI_B, setPlayingXI_B] = useState<string[]>([]);
  const [openingBatsmen, setOpeningBatsmen] = useState<string[]>([]);
  const [openingBowler, setOpeningBowler] = useState('');
  const [substitutes_A, setSubstitutes_A] = useState<Substitute[]>([]);
  const [substitutes_B, setSubstitutes_B] = useState<Substitute[]>([]);

  const teamAData = teams.find(t => t.id === teamA);
  const teamBData = teams.find(t => t.id === teamB);
  const teamAPlayers = getTeamPlayers(teamA);
  const teamBPlayers = getTeamPlayers(teamB);
  const availablePlayers = players.filter(p =>
    (!p.teamId || (p.teamId !== teamA && p.teamId !== teamB)) &&
    !substitutes_A.some(sub => sub.playerId === p.id) &&
    !substitutes_B.some(sub => sub.playerId === p.id)
  );

  const battingTeamId = tossDecision === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA);
  const bowlingTeamId = tossDecision === 'bowl' ? tossWinner : (tossWinner === teamA ? teamB : teamA);
  const battingTeamPlayers = battingTeamId === teamA ? playingXI_A : playingXI_B;
  const bowlingTeamPlayers = bowlingTeamId === teamA ? playingXI_A : playingXI_B;

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return matchType && totalOvers && selectedGround;
      case 'teams':
        return teamA && teamB && teamA !== teamB;
      case 'toss':
        return tossWinner && tossDecision;
      case 'players':
        const totalA = playingXI_A.length + substitutes_A.length;
        const totalB = playingXI_B.length + substitutes_B.length;
        return playingXI_A.length >= 2 && playingXI_A.length <= parseInt(totalPlayersEachSide) &&
          playingXI_B.length >= 2 && playingXI_B.length <= parseInt(totalPlayersEachSide) &&
          totalA <= parseInt(totalPlayersEachSide) && totalB <= parseInt(totalPlayersEachSide) &&
          openingBatsmen.length === 2 && openingBowler;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'basics') setStep('teams');
    else if (step === 'teams') setStep('toss');
    else if (step === 'toss') setStep('players');
    else if (step === 'players') handleCreateMatch();
  };

  const handleBack = () => {
    if (step === 'teams') setStep('basics');
    else if (step === 'toss') setStep('teams');
    else if (step === 'players') setStep('toss');
    else router.back();
  };

  const handleCreateMatch = () => {
    const newMatch: CricketMatch = {
      id: `match_${Date.now()}`,
      sport: 'cricket',
      status: 'upcoming',
      matchType,
      totalOvers: parseInt(totalOvers, 10),
      ground: selectedGround,
      teamA,
      teamB,
      tossWinner,
      tossDecision,
      playingXI_A,
      playingXI_B,
      substitutes_A,
      substitutes_B,
      currentInnings: 1,
      innings: [{
        battingTeam: battingTeamId,
        bowlingTeam: bowlingTeamId,
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        batsmen: [],
        bowlers: [],
        currentStriker: openingBatsmen[0],
        currentNonStriker: openingBatsmen[1],
        currentBowler: openingBowler,
        allBalls: [],
        thisOver: [],
        fallOfWickets: [],
      }],
      createdAt: new Date().toISOString(),
    };

    Alert.alert(
      'Start Match?',
      'Do you want to start the match now or save it as upcoming?',
      [
        {
          text: 'Save as Upcoming',
          onPress: () => {
            const battingTeamId = tossDecision === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA);

            let updatedMatch = { ...newMatch };

            if (battingTeamId !== teamA) {
              updatedMatch = {
                ...updatedMatch,
                teamA: newMatch.teamB,
                teamB: newMatch.teamA,
                playingXI_A: newMatch.playingXI_B,
                playingXI_B: newMatch.playingXI_A,
                substitutes_A: newMatch.substitutes_B,
                substitutes_B: newMatch.substitutes_A,
              }
            }

            setUpcomingMatches(prev => [updatedMatch, ...prev]);
            router.back();
          },
        },
        {
          text: 'Start Now',
          style: 'default',
          onPress: () => {
            const battingTeamId = tossDecision === 'bat' ? tossWinner : (tossWinner === teamA ? teamB : teamA);

            let updatedMatch = { ...newMatch };

            if (battingTeamId !== teamA) {
              updatedMatch = {
                ...updatedMatch,
                teamA: newMatch.teamB,
                teamB: newMatch.teamA,
                playingXI_A: newMatch.playingXI_B,
                playingXI_B: newMatch.playingXI_A,
                substitutes_A: newMatch.substitutes_B,
                substitutes_B: newMatch.substitutes_A,
              }
            }

            setCurrentMatch({ ...updatedMatch, status: 'live', startedAt: new Date().toISOString() });
            router.replace('/match/live-scoring');
          },
        },
      ]
    );
  };

  const togglePlayerSelection = (playerId: string, team: 'A' | 'B') => {
    const maxPlayers = parseInt(totalPlayersEachSide);
    if (team === 'A') {
      setPlayingXI_A(prev => {
        const isSelected = prev.includes(playerId);
        if (isSelected) {
          return prev.filter(p => p !== playerId);
        } else if (prev.length < maxPlayers) {
          return [...prev, playerId];
        }
        return prev;
      });
    } else {
      setPlayingXI_B(prev => {
        const isSelected = prev.includes(playerId);
        if (isSelected) {
          return prev.filter(p => p !== playerId);
        } else if (prev.length < maxPlayers) {
          return [...prev, playerId];
        }
        return prev;
      });
    }
  };

  const toggleOpeningBatsman = (playerId: string) => {
    setOpeningBatsmen(prev => {
      if (prev.includes(playerId)) return prev.filter(p => p !== playerId);
      if (prev.length >= 2) return prev;
      return [...prev, playerId];
    });
  };

  const selectSubstituteWithTeamAndPermissions = (playerId: string) => {
    const maxPlayers = parseInt(totalPlayersEachSide);

    // Check if already selected by any team
    const alreadySelectedInA = substitutes_A.some(sub => sub.playerId === playerId);
    const alreadySelectedInB = substitutes_B.some(sub => sub.playerId === playerId);

    if (alreadySelectedInA) {
      Alert.alert('Player Already Selected', `This player is already selected as a substitute for ${teamAData?.name}.`);
      return;
    }

    if (alreadySelectedInB) {
      Alert.alert('Player Already Selected', `This player is already selected as a substitute for ${teamBData?.name}.`);
      return;
    }

    // First step: Ask which team
    Alert.alert(
      'Assign to Team',
      'Which team should this substitute be assigned to?',
      [
        {
          text: teamAData?.name || 'Team A',
          onPress: () => {
            const totalA = playingXI_A.length + substitutes_A.length;
            if (totalA >= maxPlayers) {
              Alert.alert('Limit Reached', `${teamAData?.name} has reached the maximum of ${maxPlayers} players.`);
              return;
            }
            askSubstitutePermissions(playerId, 'A');
          },
        },
        {
          text: teamBData?.name || 'Team B',
          onPress: () => {
            const totalB = playingXI_B.length + substitutes_B.length;
            if (totalB >= maxPlayers) {
              Alert.alert('Limit Reached', `${teamBData?.name} has reached the maximum of ${maxPlayers} players.`);
              return;
            }
            askSubstitutePermissions(playerId, 'B');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const askSubstitutePermissions = (playerId: string, team: 'A' | 'B') => {
    Alert.alert(
      'Substitute Capabilities',
      'Select what this substitute can do:',
      [
        {
          text: 'Bat & Bowl',
          onPress: () => addSubstitute(playerId, team, true, true),
        },
        {
          text: 'Bat Only',
          onPress: () => addSubstitute(playerId, team, true, false),
        },
        {
          text: 'Bowl Only',
          onPress: () => addSubstitute(playerId, team, false, true),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const addSubstitute = (playerId: string, team: 'A' | 'B', canBat: boolean, canBowl: boolean) => {
    const newSub: Substitute = { playerId, canBat, canBowl };
    if (team === 'A') {
      setSubstitutes_A(prev => [...prev, newSub]);
    } else {
      setSubstitutes_B(prev => [...prev, newSub]);
    }
  };

  const removeSubstitute = (playerId: string) => {
    const inTeamA = substitutes_A.findIndex(s => s.playerId === playerId);
    const inTeamB = substitutes_B.findIndex(s => s.playerId === playerId);

    if (inTeamA >= 0) {
      setSubstitutes_A(prev => prev.filter(s => s.playerId !== playerId));
    } else if (inTeamB >= 0) {
      setSubstitutes_B(prev => prev.filter(s => s.playerId !== playerId));
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Cricket Match',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.progressContainer}>
        {['basics', 'teams', 'toss', 'players'].map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['basics', 'teams', 'toss', 'players'].indexOf(step) > i && styles.progressDotCompleted,
            ]}>
              {['basics', 'teams', 'toss', 'players'].indexOf(step) > i && (
                <Check size={12} color={Colors.background} />
              )}
            </View>
            {i < 3 && <View style={[
              styles.progressLine,
              ['basics', 'teams', 'toss', 'players'].indexOf(step) > i && styles.progressLineActive,
            ]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'basics' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Match Details</Text>

            <Text style={styles.label}>Match Type</Text>
            <View style={styles.optionsRow}>
              {matchTypes.map((match) => (
                <TouchableOpacity
                  key={match.key}
                  style={[styles.optionChip, styles.optionChipWide, matchType === match.key && styles.optionChipActive]}
                  onPress={() => setMatchType(match.key)}
                >
                  <Text style={[styles.optionText, matchType === match.key && styles.optionTextActive]}>
                    {match.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Total Players in Each Team</Text>
            <TextInput
              style={styles.input}
              value={totalPlayersEachSide}
              onChangeText={setTotalPlayersEachSide}
              keyboardType="number-pad"
              placeholder="Enter no. of players"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Total Overs</Text>
            <TextInput
              style={styles.input}
              value={totalOvers}
              onChangeText={setTotalOvers}
              keyboardType="number-pad"
              placeholder="Enter overs"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Ground</Text>
            <View style={styles.selectContainer}>
              {grounds.map((ground) => (
                <TouchableOpacity
                  key={ground}
                  style={[styles.selectItem, selectedGround === ground && styles.selectItemActive]}
                  onPress={() => setSelectedGround(ground)}
                >
                  <Text style={[styles.selectText, selectedGround === ground && styles.selectTextActive]}>
                    {ground}
                  </Text>
                  {selectedGround === ground && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 'teams' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Teams</Text>

            <Text style={styles.label}>Team A</Text>
            <View style={styles.teamSelectContainer}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamCard,
                    teamA === team.id && styles.teamCardActive,
                    teamB === team.id && styles.teamCardDisabled,
                  ]}
                  onPress={() => teamB !== team.id && setTeamA(team.id)}
                  disabled={teamB === team.id}
                >
                  <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
                    <Text style={styles.teamInitials}>{team.shortName}</Text>
                  </View>
                  <Text style={styles.teamCardName}>{team.name}</Text>
                  {teamA === team.id && (
                    <View style={styles.checkBadge}>
                      <Check size={14} color={Colors.text} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Team B</Text>
            <View style={styles.teamSelectContainer}>
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamCard,
                    teamB === team.id && styles.teamCardActive,
                    teamA === team.id && styles.teamCardDisabled,
                  ]}
                  onPress={() => teamA !== team.id && setTeamB(team.id)}
                  disabled={teamA === team.id}
                >
                  <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
                    <Text style={styles.teamInitials}>{team.shortName}</Text>
                  </View>
                  <Text style={styles.teamCardName}>{team.name}</Text>
                  {teamB === team.id && (
                    <View style={styles.checkBadge}>
                      <Check size={14} color={Colors.text} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 'toss' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Toss Details</Text>

            <Text style={styles.label}>Toss Winner</Text>
            <View style={styles.tossOptions}>
              {[teamAData, teamBData].filter(Boolean).map((team) => (
                <TouchableOpacity
                  key={team!.id}
                  style={[styles.tossCard, tossWinner === team!.id && styles.tossCardActive]}
                  onPress={() => setTossWinner(team!.id)}
                >
                  <View style={[styles.tossTeamLogo, { backgroundColor: team!.color }]}>
                    <Text style={styles.tossTeamInitials}>{team!.shortName}</Text>
                  </View>
                  <Text style={styles.tossTeamName}>{team!.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tossWinner && (
              <>
                <Text style={styles.label}>Toss Decision</Text>
                <View style={styles.decisionOptions}>
                  <TouchableOpacity
                    style={[styles.decisionCard, tossDecision === 'bat' && styles.decisionCardActive]}
                    onPress={() => setTossDecision('bat')}
                  >
                    <Text style={styles.decisionEmoji}>🏏</Text>
                    <Text style={[styles.decisionText, tossDecision === 'bat' && styles.decisionTextActive]}>
                      Bat First
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.decisionCard, tossDecision === 'bowl' && styles.decisionCardActive]}
                    onPress={() => setTossDecision('bowl')}
                  >
                    <Text style={styles.decisionEmoji}>⚾</Text>
                    <Text style={[styles.decisionText, tossDecision === 'bowl' && styles.decisionTextActive]}>
                      Bowl First
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {step === 'players' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Playing XI</Text>

            <Text style={styles.label}>{teamAData?.name} ({playingXI_A.length + substitutes_A.length}/{totalPlayersEachSide})</Text>
            <View style={styles.playersList}>
              {teamAPlayers.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerItem, playingXI_A.includes(player.id) && styles.playerItemActive]}
                  onPress={() => togglePlayerSelection(player.id, 'A')}
                >
                  <View>
                    <Text style={styles.playerName}>{player.name}{getTeamById(teamA)?.captain === player.id && ' (C)'}</Text>
                  </View>

                  <Text style={styles.playerRole}>{player.position}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{teamBData?.name} ({playingXI_B.length + substitutes_B.length}/{totalPlayersEachSide})</Text>
            <View style={styles.playersList}>
              {teamBPlayers.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerItem, playingXI_B.includes(player.id) && styles.playerItemActive]}
                  onPress={() => togglePlayerSelection(player.id, 'B')}
                >
                  <View>
                    <Text style={styles.playerName}>{player.name}{getTeamById(teamB)?.captain === player.id && ' (C)'}</Text>
                  </View>
                  <Text style={styles.playerRole}>{player.position}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(playingXI_A.length >= 2 && playingXI_B.length >= 2) && (
              <>
                <Text style={styles.label}>Opening Batsmen ({openingBatsmen.length}/2)</Text>
                <View style={styles.playersList}>
                  {battingTeamPlayers.map((playerId) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;
                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerItem, openingBatsmen.includes(player.id) && styles.playerItemActive]}
                        onPress={() => toggleOpeningBatsman(player.id)}
                      >
                        <Text style={styles.playerName}>{player.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {(() => {
                    const battingTeamSubs = battingTeamId === teamA ? substitutes_A : substitutes_B;
                    return battingTeamSubs
                      .filter(sub => sub.canBat)
                      .map((sub) => {
                        const player = players.find(p => p.id === sub.playerId);
                        if (!player) return null;
                        return (
                          <TouchableOpacity
                            key={`sub-${player.id}`}
                            style={[styles.playerItem, openingBatsmen.includes(player.id) && styles.playerItemActive]}
                            onPress={() => toggleOpeningBatsman(player.id)}
                          >
                            <Text style={styles.playerName}>{player.name} (Sub)</Text>
                          </TouchableOpacity>
                        );
                      });
                  })()}
                </View>

                <Text style={styles.label}>Opening Bowler</Text>
                <View style={styles.playersList}>
                  {bowlingTeamPlayers.map((playerId) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;
                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerItem, openingBowler === player.id && styles.playerItemActive]}
                        onPress={() => setOpeningBowler(player.id)}
                      >
                        <Text style={styles.playerName}>{player.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {(() => {
                    const bowlingTeamSubs = bowlingTeamId === teamA ? substitutes_A : substitutes_B;
                    return bowlingTeamSubs
                      .filter(sub => sub.canBowl)
                      .map((sub) => {
                        const player = players.find(p => p.id === sub.playerId);
                        if (!player) return null;
                        return (
                          <TouchableOpacity
                            key={`sub-${player.id}`}
                            style={[styles.playerItem, openingBowler === player.id && styles.playerItemActive]}
                            onPress={() => setOpeningBowler(player.id)}
                          >
                            <Text style={styles.playerName}>{player.name} (Sub)</Text>
                          </TouchableOpacity>
                        );
                      });
                  })()}
                </View>

                <Text style={styles.label}>Substitutes ({substitutes_A.length + substitutes_B.length})</Text>
                <View style={styles.playersList}>
                  {availablePlayers.map((player) => {
                    const subInA = substitutes_A.find(s => s.playerId === player.id);
                    const subInB = substitutes_B.find(s => s.playerId === player.id);
                    const sub = subInA || subInB;
                    const assignedTeam = subInA ? teamAData?.name : subInB ? teamBData?.name : null;

                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerItem, sub && styles.playerItemActive]}
                        onPress={() => sub ? removeSubstitute(player.id) : selectSubstituteWithTeamAndPermissions(player.id)}
                      >
                        <View>
                          <Text style={styles.playerName}>{player.name}</Text>
                          {sub && (
                            <View>
                              <Text style={styles.playerRole}>
                                {assignedTeam} - {sub.canBat && sub.canBowl ? 'Bat & Bowl' : sub.canBat ? 'Bat Only' : 'Bowl Only'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.playerRole}>{player.position}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextBtnText}>
            {step === 'players' ? 'Create Match' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBtn: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primary,
  },
  progressLine: {
    width: 50,
    height: 2,
    backgroundColor: Colors.border,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    paddingTop: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipWide: {
    flex: 1,
    alignItems: 'center',
  },
  optionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.background,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectContainer: {
    gap: 8,
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectItemActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  selectText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  teamSelectContainer: {
    gap: 10,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  teamCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  teamCardDisabled: {
    opacity: 0.4,
  },
  teamLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  teamCardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tossOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  tossCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  tossCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  tossTeamLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tossTeamInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  tossTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  decisionOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  decisionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  decisionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  decisionEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  decisionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  decisionTextActive: {
    color: Colors.primary,
  },
  playersList: {
    gap: 8,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerItemActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  playerRole: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: Colors.border,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
});
