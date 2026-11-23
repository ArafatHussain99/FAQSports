import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { X } from 'lucide-react-native';
import { isPermissionError, PERMISSION_ERROR_MESSAGE } from '@/api/supabaseClient';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { grounds as mockGrounds } from '@/mocks/data';
import { useTableTennisMatches } from '../context';
import { pointsToWinForServes } from '../engines/scoreEngine';
import { TTFormat } from '../types';

type Step = 'basics' | 'players';

const STEPS: Step[] = ['basics', 'players'];

const BEST_OF_OPTIONS = [1, 3, 5, 7];
const SERVES_PER_TURN_OPTIONS = [2, 5];
// Singles follows the standard 2 serves each; doubles uses the house rule of 5.
const defaultServesPerTurn = (format: TTFormat) => (format === 'double' ? 5 : 2);

export default function CreateTableTennisMatchScreen() {
  const router = useRouter();
  const { players, grounds: dbGrounds } = useData();
  const { isAdmin, runWithGlobalLoading } = useApp();
  const { createMatch } = useTableTennisMatches();
  const grounds = dbGrounds.length > 0 ? dbGrounds : mockGrounds;

  const [step, setStep] = useState<Step>('basics');
  const [format, setFormat] = useState<TTFormat>('single');
  const [bestOf, setBestOf] = useState(5);
  const [servesPerTurn, setServesPerTurn] = useState(defaultServesPerTurn('single'));
  const [selectedGround, setSelectedGround] = useState<string | null>(null);
  const venue = selectedGround ?? grounds[0] ?? null;
  const [error, setError] = useState<string | null>(null);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [partnerA, setPartnerA] = useState('');
  const [partnerB, setPartnerB] = useState('');

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return !!format && bestOf > 0 && servesPerTurn > 0;
      case 'players':
        if (format === 'single') {
          return playerA && playerB && playerA !== playerB;
        } else {
          return playerA && playerB && partnerA && partnerB &&
            playerA !== playerB && partnerA !== partnerB &&
            playerA !== partnerA && playerA !== partnerB &&
            playerB !== partnerA && playerB !== partnerB;
        }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'basics') setStep('players');
  };

  const changeFormat = (next: TTFormat) => {
    setFormat(next);
    setServesPerTurn(defaultServesPerTurn(next));
  };

  const handleBack = () => {
    if (step === 'players') setStep('basics');
    else router.back();
  };

  const handleCreateMatch = async (startNow: boolean) => {
    if (!canProceed()) return;
    setError(null);
    try {
      const id = await runWithGlobalLoading(
        () =>
          createMatch({
            format,
            bestOf,
            pointsToWin: pointsToWinForServes(servesPerTurn),
            servesPerTurn,
            teamA: format === 'double' ? [playerA, partnerA] : [playerA],
            teamB: format === 'double' ? [playerB, partnerB] : [playerB],
            venue,
            // A started match opens on the scorecard's setup step (first server, sides).
            status: 'upcoming',
          }),
        'Creating match...',
      );
      if (startNow) {
        router.replace(`/table-tennis/match/${id}`);
      } else {
        router.back();
      }
    } catch (e) {
      setError(
        isPermissionError(e)
          ? PERMISSION_ERROR_MESSAGE
          : "Couldn't create the match. Check your connection and try again.",
      );
    }
  };


  const stepIndex = STEPS.indexOf(step);
  const proceed = !!canProceed();

  const renderChip = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      style={[styles.chip, styles.chipWide, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );

  const renderOptionRow = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPlayerList = (label: string, value: string, onSelect: (id: string) => void) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.list}>
        {players.map((player) =>
          renderOptionRow(player.id, player.name, value === player.id, () => onSelect(player.id)),
        )}
      </View>
    </>
  );

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Create Table Tennis Match' }} />
        <Text style={styles.stepTitle}>Admins only</Text>
        <Text style={styles.helperText}>Ask an admin to create table tennis matches.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Table Tennis Match',
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
              {renderChip('single', 'Singles', format === 'single', () => changeFormat('single'))}
              {renderChip('double', 'Doubles', format === 'double', () => changeFormat('double'))}
            </View>

            <Text style={styles.label}>Best of</Text>
            <View style={styles.chipRow}>
              {BEST_OF_OPTIONS.map((n) =>
                renderChip(String(n), n === 1 ? '1 game' : `${n} games`, bestOf === n, () => setBestOf(n)),
              )}
            </View>

            <Text style={styles.label}>Serves per turn</Text>
            <View style={styles.chipRow}>
              {SERVES_PER_TURN_OPTIONS.map((n) =>
                renderChip(String(n), `${n} serves`, servesPerTurn === n, () => setServesPerTurn(n)),
              )}
            </View>
            <Text style={[styles.helperText, styles.helperTextBelow]}>
              {format === 'double'
                ? `Doubles: the player on the right serves ${servesPerTurn} times, swaps sides with their partner, then the other team's player on the right serves.`
                : `Singles: service changes every ${servesPerTurn} points.`}
              {` Games to ${pointsToWinForServes(servesPerTurn)}. At ${pointsToWinForServes(servesPerTurn) - 1}-${pointsToWinForServes(servesPerTurn) - 1} it's deuce: the first side to win 2 points in a row takes the game, and service changes every point.`}
            </Text>

            <Text style={styles.label}>Venue</Text>
            <View style={styles.list}>
              {grounds.map((ground) =>
                renderOptionRow(ground, ground, venue === ground, () => setSelectedGround(ground)),
              )}
            </View>
          </View>
        )}

        {step === 'players' && (
          <View>
            <Text style={styles.stepTitle}>Select players</Text>

            {renderPlayerList('Team A / Player 1', playerA, setPlayerA)}
            {renderPlayerList('Team B / Player 2', playerB, setPlayerB)}

            {format === 'double' && (
              <>
                {renderPlayerList('Partner for Team A', partnerA, setPartnerA)}
                {renderPlayerList('Partner for Team B', partnerB, setPartnerB)}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {step === 'basics' ? (
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
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryBtn, styles.equalBtn, !proceed && styles.disabled]}
              onPress={() => handleCreateMatch(false)}
              disabled={!proceed}
              accessibilityRole="button"
              accessibilityState={{ disabled: !proceed }}
            >
              <Text style={styles.secondaryBtnText}>Save for later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryBtn, styles.equalBtn, !proceed && styles.disabled]}
              onPress={() => handleCreateMatch(true)}
              disabled={!proceed}
              accessibilityRole="button"
              accessibilityState={{ disabled: !proceed }}
            >
              <Text style={styles.primaryBtnText}>Start now</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space.xxl,
  },
  headerBtn: {
    padding: Space.sm,
  },
  helperText: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  helperTextBelow: {
    marginTop: Space.sm,
  },
  errorText: {
    ...Type.footnote,
    fontWeight: '600',
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Space.sm,
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  chip: {
    minHeight: Touch,
    paddingHorizontal: Space.sm,
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
  equalBtn: {
    flex: 1,
    paddingHorizontal: Space.sm,
  },
  primaryBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
});
