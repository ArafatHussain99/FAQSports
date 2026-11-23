import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';
import { useFootballMatches } from '../context';
import { FootballMatch, FootballMatchFormat } from '../types';
import { grounds } from '@/mocks/data';

type Step = 'basics' | 'teams' | 'players';

const STEPS: Step[] = ['basics', 'teams', 'players'];

export const footballMatchFormats: { key: FootballMatchFormat; label: string }[] = [
  { key: 'friendly', label: 'Friendly' },
  { key: 'league', label: 'League' },
  { key: 'knockout', label: 'Knockout' },
];

export default function CreateFootballMatchScreen() {
  const router = useRouter();
  const { teams, getTeamPlayers } = useData();
  const { setUpcomingMatches, setCurrentMatch } = useFootballMatches();

  const [step, setStep] = useState<Step>('basics');
  const [format, setFormat] = useState<FootballMatchFormat>('friendly');
  const [duration, setDuration] = useState('90');
  const [totalPlayersEachSide, setTotalPlayersEachSide] = useState('11');
  const [selectedGround, setSelectedGround] = useState(grounds[0]);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [playingXI_A, setPlayingXI_A] = useState<string[]>([]);
  const [playingXI_B, setPlayingXI_B] = useState<string[]>([]);

  const teamAData = teams.find(t => t.id === teamA);
  const teamBData = teams.find(t => t.id === teamB);
  const teamAPlayers = getTeamPlayers(teamA);
  const teamBPlayers = getTeamPlayers(teamB);

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return format && duration && selectedGround;
      case 'teams':
        return teamA && teamB && teamA !== teamB;
      case 'players':
        return playingXI_A.length >= 1 && playingXI_B.length >= 1;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'basics') setStep('teams');
    else if (step === 'teams') setStep('players');
    else if (step === 'players') handleCreateMatch();
  };

  const handleBack = () => {
    if (step === 'teams') setStep('basics');
    else if (step === 'players') setStep('teams');
    else router.back();
  };

  const handleCreateMatch = () => {
    const newMatch: FootballMatch = {
      id: `match_${Date.now()}`,
      sport: 'football',
      status: 'upcoming',
      format,
      duration: parseInt(duration, 10),
      ground: selectedGround,
      teamA,
      teamB,
      playingXI_A,
      playingXI_B,
      substitutes_A: [],
      substitutes_B: [],
      score: {
        teamA: 0,
        teamB: 0,
      },
      events: [],
      createdAt: new Date().toISOString(),
    };

    Alert.alert(
      'Start Match?',
      'Do you want to start the match now or save it as upcoming?',
      [
        {
          text: 'Save as Upcoming',
          onPress: () => {
            setUpcomingMatches(prev => [newMatch, ...prev]);
            router.back();
          },
        },
        {
          text: 'Start Now',
          style: 'default',
          onPress: () => {
            setCurrentMatch({ ...newMatch, status: 'live', startedAt: new Date().toISOString() });
            // Note: Create football-live-scoring route later
            router.back();
          },
        },
      ]
    );
  };

  const togglePlayerSelection = (playerId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      setPlayingXI_A(prev =>
        prev.includes(playerId) ? prev.filter(p => p !== playerId) : [...prev, playerId]
      );
    } else {
      setPlayingXI_B(prev =>
        prev.includes(playerId) ? prev.filter(p => p !== playerId) : [...prev, playerId]
      );
    }
  };

  const stepIndex = STEPS.indexOf(step);
  const proceed = !!canProceed();
  const maxShown = parseInt(totalPlayersEachSide, 10) || 11;

  const renderTeamOption = (
    team: { id: string; name: string; color: string },
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={team.id}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
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
    meta?: string,
  ) => (
    <TouchableOpacity
      key={key}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.checkBox, selected && styles.checkBoxSelected]}>
        {selected && <Check size={14} color={Colors.textInverse} strokeWidth={3} />}
      </View>
      <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
        {name}
      </Text>
      {!!meta && (
        <Text style={[styles.rowMeta, selected && styles.rowMetaSelected]}>{meta}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Football Match',
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

            <Text style={styles.label}>Match format</Text>
            <View style={styles.chipRow}>
              {footballMatchFormats.map((match) => {
                const selected = format === match.key;
                return (
                  <TouchableOpacity
                    key={match.key}
                    style={[styles.chip, styles.chipWide, selected && styles.chipSelected]}
                    onPress={() => setFormat(match.key)}
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

            <Text style={styles.label}>Match duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="e.g. 90"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Players in each team</Text>
            <TextInput
              style={styles.input}
              value={totalPlayersEachSide}
              onChangeText={setTotalPlayersEachSide}
              keyboardType="number-pad"
              placeholder="e.g. 11"
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
                renderTeamOption(team, teamA === team.id, () => setTeamA(team.id)),
              )}
            </View>

            <Text style={styles.label}>Team B</Text>
            <View style={styles.list}>
              {teams.map((team) =>
                renderTeamOption(team, teamB === team.id, () => setTeamB(team.id)),
              )}
            </View>
          </View>
        )}

        {step === 'players' && (
          <View>
            <Text style={styles.stepTitle}>Select players</Text>

            {teamAData && (
              <>
                <View style={styles.labelRow}>
                  <View style={[styles.pin, { backgroundColor: teamAData.color }]} />
                  <Text style={styles.labelInline}>{teamAData.name}</Text>
                  <Text style={styles.count}>{playingXI_A.length}/{totalPlayersEachSide}</Text>
                </View>
                <View style={styles.list}>
                  {teamAPlayers.slice(0, maxShown).map((player) =>
                    renderPlayerRow(
                      player.id,
                      player.name,
                      playingXI_A.includes(player.id),
                      () => {
                        if (playingXI_A.includes(player.id) || playingXI_A.length < parseInt(totalPlayersEachSide, 10) || 11) {
                          togglePlayerSelection(player.id, 'A');
                        }
                      },
                      player.position,
                    ),
                  )}
                </View>
              </>
            )}

            {teamBData && (
              <>
                <View style={styles.labelRow}>
                  <View style={[styles.pin, { backgroundColor: teamBData.color }]} />
                  <Text style={styles.labelInline}>{teamBData.name}</Text>
                  <Text style={styles.count}>{playingXI_B.length}/{totalPlayersEachSide}</Text>
                </View>
                <View style={styles.list}>
                  {teamBPlayers.slice(0, maxShown).map((player) =>
                    renderPlayerRow(
                      player.id,
                      player.name,
                      playingXI_B.includes(player.id),
                      () => {
                        if (playingXI_B.includes(player.id) || playingXI_B.length < parseInt(totalPlayersEachSide, 10) || 11) {
                          togglePlayerSelection(player.id, 'B');
                        }
                      },
                      player.position,
                    ),
                  )}
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
