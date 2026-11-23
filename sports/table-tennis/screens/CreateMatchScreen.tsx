import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { isPermissionError, PERMISSION_ERROR_MESSAGE } from '@/api/supabaseClient';
import Colors from '@/constants/colors';
import { useApp, useData } from '@/context/AppContext';
import { grounds as mockGrounds } from '@/mocks/data';
import { useTableTennisMatches } from '../context';
import { pointsToWinForServes } from '../engines/scoreEngine';
import { TTFormat } from '../types';

type Step = 'basics' | 'players';

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
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Table Tennis Match',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.progressContainer}>
        {['basics', 'players'].map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['basics', 'players'].indexOf(step) > i && styles.progressDotCompleted,
            ]}>
              {['basics', 'players'].indexOf(step) > i && (
                <Check size={12} color={Colors.background} />
              )}
            </View>
            {i < 1 && <View style={[
              styles.progressLine,
              ['basics', 'players'].indexOf(step) > i && styles.progressLineActive,
            ]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'basics' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Match Details</Text>

            <Text style={styles.label}>Match Format</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionChip, styles.optionChipWide, format === 'single' && styles.optionChipActive]}
                onPress={() => changeFormat('single')}
              >
                <Text style={[styles.optionText, format === 'single' && styles.optionTextActive]}>
                  Singles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionChip, styles.optionChipWide, format === 'double' && styles.optionChipActive]}
                onPress={() => changeFormat('double')}
              >
                <Text style={[styles.optionText, format === 'double' && styles.optionTextActive]}>
                  Doubles
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Best of</Text>
            <View style={styles.optionsRow}>
              {BEST_OF_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.optionChip, bestOf === n && styles.optionChipActive]}
                  onPress={() => setBestOf(n)}
                >
                  <Text style={[styles.optionText, bestOf === n && styles.optionTextActive]}>
                    {n === 1 ? '1 game' : `${n} games`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Serves per turn</Text>
            <View style={styles.optionsRow}>
              {SERVES_PER_TURN_OPTIONS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.optionChip, servesPerTurn === n && styles.optionChipActive]}
                  onPress={() => setServesPerTurn(n)}
                >
                  <Text style={[styles.optionText, servesPerTurn === n && styles.optionTextActive]}>
                    {n} serves
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {format === 'double'
                ? `Doubles: the player on the right serves ${servesPerTurn} times, swaps sides with their partner, then the other team's player on the right serves.`
                : `Singles: service changes every ${servesPerTurn} points.`}
              {` Games to ${pointsToWinForServes(servesPerTurn)}. At ${pointsToWinForServes(servesPerTurn) - 1}-${pointsToWinForServes(servesPerTurn) - 1} it's deuce: the first side to win 2 points in a row takes the game, and service changes every point.`}
            </Text>

            <Text style={styles.label}>Venue</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScrollView}
              contentContainerStyle={styles.optionsContent}
            >
              {grounds.map((ground) => (
                <TouchableOpacity
                  key={ground}
                  style={[styles.groundChip, venue === ground && styles.groundChipActive]}
                  onPress={() => setSelectedGround(ground)}
                >
                  <Text style={[styles.groundText, venue === ground && styles.groundTextActive]}>
                    {ground}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {step === 'players' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Players</Text>

            <View style={styles.playerSection}>
              <Text style={styles.sectionLabel}>Team A / Player 1</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsContent}
              >
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerChip, playerA === player.id && styles.playerChipActive]}
                    onPress={() => setPlayerA(player.id)}
                  >
                    <Text style={[styles.playerChipText, playerA === player.id && styles.playerChipTextActive]}>
                      {player.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.playerSection}>
              <Text style={styles.sectionLabel}>Team B / Player 2</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsContent}
              >
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerChip, playerB === player.id && styles.playerChipActive]}
                    onPress={() => setPlayerB(player.id)}
                  >
                    <Text style={[styles.playerChipText, playerB === player.id && styles.playerChipTextActive]}>
                      {player.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {format === 'double' && (
              <>
                <View style={styles.playerSection}>
                  <Text style={styles.sectionLabel}>Partner for Team A</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionsScrollView}
                    contentContainerStyle={styles.optionsContent}
                  >
                    {players.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerChip, partnerA === player.id && styles.playerChipActive]}
                        onPress={() => setPartnerA(player.id)}
                      >
                        <Text style={[styles.playerChipText, partnerA === player.id && styles.playerChipTextActive]}>
                          {player.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.playerSection}>
                  <Text style={styles.sectionLabel}>Partner for Team B</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionsScrollView}
                    contentContainerStyle={styles.optionsContent}
                  >
                    {players.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerChip, partnerB === player.id && styles.playerChipActive]}
                        onPress={() => setPartnerB(player.id)}
                      >
                        <Text style={[styles.playerChipText, partnerB === player.id && styles.playerChipTextActive]}>
                          {player.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {step === 'basics' ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleBack}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !canProceed() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, !canProceed() && styles.buttonDisabled]}
            onPress={() => handleCreateMatch(false)}
            disabled={!canProceed()}
          >
            <Text style={styles.cancelButtonText}>Save for Later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !canProceed() && styles.buttonDisabled]}
            onPress={() => handleCreateMatch(true)}
            disabled={!canProceed()}
          >
            <Text style={styles.buttonText}>Start Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -8,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    borderColor: Colors.tableTennis,
    backgroundColor: Colors.tableTennis,
  },
  progressDotCompleted: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  progressLine: {
    width: 16,
    height: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: Colors.tableTennis,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  optionChipWide: {
    flex: 1,
  },
  optionChipActive: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  optionTextActive: {
    color: Colors.background,
  },
  optionsScrollView: {
    marginBottom: 16,
  },
  optionsContent: {
    paddingRight: 20,
  },
  groundChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  groundChipActive: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  groundText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  groundTextActive: {
    color: Colors.background,
  },
  playerSection: {
    marginBottom: 20,
  },
  playerChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  playerChipActive: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  playerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  playerChipTextActive: {
    color: Colors.background,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.tableTennis,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  cancelButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});
