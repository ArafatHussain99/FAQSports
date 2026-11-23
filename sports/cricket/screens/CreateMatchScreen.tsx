import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';
import { matchTypes } from '../constants';
import { useCricketMatches } from '../context';
import { CricketMatch, CricketMatchType, TossDecision, Substitute } from '../types';

type Step = 'basics' | 'teams' | 'toss' | 'players';

const STEPS: Step[] = ['basics', 'teams', 'toss', 'players'];

export default function CreateMatchScreen() {
  const router = useRouter();
  const { teams, players, getTeamPlayers, getTeamById, grounds } = useData();
  const { setUpcomingMatches, setCurrentMatch } = useCricketMatches();

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
            router.replace('/cricket/live-scoring');
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


  const stepIndex = STEPS.indexOf(step);
  const proceed = !!canProceed();

  const renderTeamOption = (
    team: { id: string; name: string; color: string },
    selected: boolean,
    disabled: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={team.id}
      style={[styles.row, selected && styles.rowSelected, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <View style={[styles.pin, { backgroundColor: team.color }]} />
      <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
        {team.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPlayerRow = (
    key: string,
    name: string,
    selected: boolean,
    onPress: () => void,
    options: { multi?: boolean; meta?: string; sub?: string } = {},
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      accessibilityRole={options.multi ? 'checkbox' : 'radio'}
      accessibilityState={options.multi ? { checked: selected } : { selected }}
    >
      {options.multi && (
        <View style={[styles.checkBox, selected && styles.checkBoxSelected]}>
          {selected && <Check size={14} color={Colors.textInverse} strokeWidth={3} />}
        </View>
      )}
      <View style={styles.rowMain}>
        <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
          {name}
        </Text>
        {!!options.sub && (
          <Text style={[styles.rowMeta, selected && styles.rowMetaSelected]}>{options.sub}</Text>
        )}
      </View>
      {!!options.meta && (
        <Text style={[styles.rowMeta, selected && styles.rowMetaSelected]}>{options.meta}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Cricket Match',
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>Step {stepIndex + 1} of {STEPS.length}</Text>
        <View style={styles.progressRule}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[styles.progressSegment, i <= stepIndex && styles.progressSegmentDone]}
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'basics' && (
          <View>
            <Text style={styles.stepTitle}>Match details</Text>

            <Text style={styles.label}>Match type</Text>
            <View style={styles.chipRow}>
              {matchTypes.map((match) => {
                const selected = matchType === match.key;
                return (
                  <TouchableOpacity
                    key={match.key}
                    style={[styles.chip, styles.chipWide, selected && styles.chipSelected]}
                    onPress={() => setMatchType(match.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {match.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Players in each team</Text>
            <TextInput
              style={styles.input}
              value={totalPlayersEachSide}
              onChangeText={setTotalPlayersEachSide}
              keyboardType="number-pad"
              placeholder="Enter no. of players"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Total overs</Text>
            <TextInput
              style={styles.input}
              value={totalOvers}
              onChangeText={setTotalOvers}
              keyboardType="number-pad"
              placeholder="Enter overs"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Ground</Text>
            <View style={styles.list}>
              {grounds.map((ground) => {
                const selected = selectedGround === ground;
                return (
                  <TouchableOpacity
                    key={ground}
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => setSelectedGround(ground)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{ground}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 'teams' && (
          <View>
            <Text style={styles.stepTitle}>Select teams</Text>

            <Text style={styles.label}>Team A</Text>
            <View style={styles.list}>
              {teams.map((team) =>
                renderTeamOption(
                  team,
                  teamA === team.id,
                  teamB === team.id,
                  () => teamB !== team.id && setTeamA(team.id),
                ),
              )}
            </View>

            <Text style={styles.label}>Team B</Text>
            <View style={styles.list}>
              {teams.map((team) =>
                renderTeamOption(
                  team,
                  teamB === team.id,
                  teamA === team.id,
                  () => teamA !== team.id && setTeamB(team.id),
                ),
              )}
            </View>
          </View>
        )}

        {step === 'toss' && (
          <View>
            <Text style={styles.stepTitle}>Toss details</Text>

            <Text style={styles.label}>Toss winner</Text>
            <View style={styles.list}>
              {[teamAData, teamBData].filter(Boolean).map((team) =>
                renderTeamOption(team!, tossWinner === team!.id, false, () => setTossWinner(team!.id)),
              )}
            </View>

            {tossWinner && (
              <>
                <Text style={styles.label}>Toss decision</Text>
                <View style={styles.chipRow}>
                  {(['bat', 'bowl'] as const).map((decision) => {
                    const selected = tossDecision === decision;
                    return (
                      <TouchableOpacity
                        key={decision}
                        style={[styles.chip, styles.chipWide, selected && styles.chipSelected]}
                        onPress={() => setTossDecision(decision)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {decision === 'bat' ? 'Bat first' : 'Bowl first'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {step === 'players' && (
          <View>
            <Text style={styles.stepTitle}>Select playing XI</Text>

            <View style={styles.labelRow}>
              {teamAData && <View style={[styles.pin, { backgroundColor: teamAData.color }]} />}
              <Text style={styles.labelInline}>{teamAData?.name}</Text>
              <Text style={styles.count}>{playingXI_A.length + substitutes_A.length}/{totalPlayersEachSide}</Text>
            </View>
            <View style={styles.list}>
              {teamAPlayers.map((player) =>
                renderPlayerRow(
                  player.id,
                  `${player.name}${getTeamById(teamA)?.captain === player.id ? ' (C)' : ''}`,
                  playingXI_A.includes(player.id),
                  () => togglePlayerSelection(player.id, 'A'),
                  { multi: true, meta: player.position },
                ),
              )}
            </View>

            <View style={styles.labelRow}>
              {teamBData && <View style={[styles.pin, { backgroundColor: teamBData.color }]} />}
              <Text style={styles.labelInline}>{teamBData?.name}</Text>
              <Text style={styles.count}>{playingXI_B.length + substitutes_B.length}/{totalPlayersEachSide}</Text>
            </View>
            <View style={styles.list}>
              {teamBPlayers.map((player) =>
                renderPlayerRow(
                  player.id,
                  `${player.name}${getTeamById(teamB)?.captain === player.id ? ' (C)' : ''}`,
                  playingXI_B.includes(player.id),
                  () => togglePlayerSelection(player.id, 'B'),
                  { multi: true, meta: player.position },
                ),
              )}
            </View>

            {(playingXI_A.length >= 2 && playingXI_B.length >= 2) && (
              <>
                <View style={styles.labelRow}>
                  <Text style={styles.labelInline}>Opening batsmen</Text>
                  <Text style={styles.count}>{openingBatsmen.length}/2</Text>
                </View>
                <View style={styles.list}>
                  {battingTeamPlayers.map((playerId) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;
                    return renderPlayerRow(
                      player.id,
                      player.name,
                      openingBatsmen.includes(player.id),
                      () => toggleOpeningBatsman(player.id),
                      { multi: true },
                    );
                  })}
                  {(() => {
                    const battingTeamSubs = battingTeamId === teamA ? substitutes_A : substitutes_B;
                    return battingTeamSubs
                      .filter(sub => sub.canBat)
                      .map((sub) => {
                        const player = players.find(p => p.id === sub.playerId);
                        if (!player) return null;
                        return renderPlayerRow(
                          `sub-${player.id}`,
                          `${player.name} (Sub)`,
                          openingBatsmen.includes(player.id),
                          () => toggleOpeningBatsman(player.id),
                          { multi: true },
                        );
                      });
                  })()}
                </View>

                <Text style={styles.label}>Opening bowler</Text>
                <View style={styles.list}>
                  {bowlingTeamPlayers.map((playerId) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player) return null;
                    return renderPlayerRow(
                      player.id,
                      player.name,
                      openingBowler === player.id,
                      () => setOpeningBowler(player.id),
                    );
                  })}
                  {(() => {
                    const bowlingTeamSubs = bowlingTeamId === teamA ? substitutes_A : substitutes_B;
                    return bowlingTeamSubs
                      .filter(sub => sub.canBowl)
                      .map((sub) => {
                        const player = players.find(p => p.id === sub.playerId);
                        if (!player) return null;
                        return renderPlayerRow(
                          `sub-${player.id}`,
                          `${player.name} (Sub)`,
                          openingBowler === player.id,
                          () => setOpeningBowler(player.id),
                        );
                      });
                  })()}
                </View>

                <View style={styles.labelRow}>
                  <Text style={styles.labelInline}>Substitutes</Text>
                  <Text style={styles.count}>{substitutes_A.length + substitutes_B.length}</Text>
                </View>
                <View style={styles.list}>
                  {availablePlayers.map((player) => {
                    const subInA = substitutes_A.find(s => s.playerId === player.id);
                    const subInB = substitutes_B.find(s => s.playerId === player.id);
                    const sub = subInA || subInB;
                    const assignedTeam = subInA ? teamAData?.name : subInB ? teamBData?.name : null;

                    return renderPlayerRow(
                      player.id,
                      player.name,
                      !!sub,
                      () => sub ? removeSubstitute(player.id) : selectSubstituteWithTeamAndPermissions(player.id),
                      {
                        multi: true,
                        meta: player.position,
                        sub: sub
                          ? `${assignedTeam} - ${sub.canBat && sub.canBowl ? 'Bat & Bowl' : sub.canBat ? 'Bat Only' : 'Bowl Only'}`
                          : undefined,
                      },
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryBtn]}
            onPress={handleBack}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryBtn, !proceed && styles.disabled]}
            onPress={handleNext}
            disabled={!proceed}
            accessibilityRole="button"
            accessibilityState={{ disabled: !proceed }}
          >
            <Text style={styles.primaryBtnText}>
              {step === 'players' ? 'Create Match' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: Space.sm,
  },
  progressContainer: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
    gap: Space.sm,
  },
  progressText: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  progressRule: {
    flexDirection: 'row',
    gap: Space.xs,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: Radius.xs,
    backgroundColor: Colors.border,
  },
  progressSegmentDone: {
    backgroundColor: Colors.ink,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.xxxl,
  },
  stepTitle: {
    ...Type.title,
    color: Colors.text,
    marginBottom: Space.sm,
  },
  label: {
    ...Type.headline,
    color: Colors.text,
    marginTop: Space.section - Space.sm,
    marginBottom: Space.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.section - Space.sm,
    marginBottom: Space.sm,
  },
  labelInline: {
    ...Type.headline,
    color: Colors.text,
    flex: 1,
  },
  count: {
    ...Type.number,
    color: Colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  chip: {
    minHeight: Touch,
    paddingHorizontal: Space.lg,
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
  },
  chipWide: {
    flex: 1,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.ink,
  },
  chipText: {
    ...Type.bodyStrong,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.onHighlight,
  },
  input: {
    height: Touch,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Space.lg,
    ...Type.body,
    color: Colors.text,
  },
  list: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: Touch,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  rowSelected: {
    backgroundColor: Colors.highlight,
  },
  rowMain: {
    flex: 1,
  },
  rowText: {
    ...Type.bodyStrong,
    color: Colors.text,
    flex: 1,
  },
  rowTextSelected: {
    color: Colors.onHighlight,
  },
  rowMeta: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  rowMetaSelected: {
    color: Colors.onHighlight,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxSelected: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  disabled: {
    opacity: 0.4,
  },
  footer: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.md,
    backgroundColor: Colors.surface,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  button: {
    height: Touch,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.lg,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  secondaryBtnText: {
    ...Type.headline,
    color: Colors.text,
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
});
