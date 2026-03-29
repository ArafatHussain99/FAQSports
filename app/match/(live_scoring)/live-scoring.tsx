import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, Button, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, RotateCcw, ArrowLeftRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMatches, useData } from '@/context/AppContext';
import { BallEvent, CricketMatch } from '@/types';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { handleScore as scoreEngineHandleScore, handleExtra as scoreEngineHandleExtra, handleUndo as scoreEngineHandleUndo } from './engines/scoreEngine';
import { handleInningsEnd, selectNewBowler, swapStrike, handleEndMatch as inningsHandleEndMatch } from './engines/inningsEngine';
import { handleWicket } from './engines/wicketEngine';

const runButtons = [
  { value: 0, label: '0', color: Colors.border },
  { value: 1, label: '1', color: Colors.surface },
  { value: 2, label: '2', color: Colors.surface },
  { value: 3, label: '3', color: Colors.surface },
  { value: 4, label: '4', color: Colors.secondary },
  { value: 6, label: '6', color: Colors.primary },
];

const extraButtons = [
  { type: 'wide' as const, label: 'Wide', color: Colors.warning },
  { type: 'no_ball' as const, label: 'No Ball', color: Colors.warning },
  { type: 'bye' as const, label: 'Bye', color: Colors.warning },
  { type: 'leg_bye' as const, label: 'Leg Bye', color: Colors.warning },
];

export default function LiveScoringScreen() {
  const router = useRouter();
  const { currentMatch, updateLiveMatch, endMatch, setLiveMatch } = useMatches();
  const { getPlayerById, getTeamById } = useData();
  const [lastBalls, setLastBalls] = useState<BallEvent[]>([]);
  const { showActionSheetWithOptions } = useActionSheet();

  const [showExtraRunsInput, setShowExtraRunsInput] = useState(false);
  const [extraType, setExtraType] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye' | null>(null);
  const [extraRunsInput, setExtraRunsInput] = useState('');

  // Memoized callback for innings end
  const handleInningsEndCallback = useCallback(
    (match: CricketMatch, battingTeamName: string | undefined) => {
      handleInningsEnd(match, battingTeamName, {
        currentMatch,
        updateLiveMatch,
        setLiveMatch,
        getPlayerById,
        getTeamById,
        endMatch,
        router,
        showActionSheetWithOptions,
      });
    },
    [currentMatch, updateLiveMatch, setLiveMatch, getPlayerById, getTeamById, endMatch, router, showActionSheetWithOptions]
  );

  // Memoized callback for selecting new bowler
  const selectNewBowlerCallback = useCallback(
    (context: any) => {
      selectNewBowler(context, {
        currentMatch,
        updateLiveMatch,
        setLiveMatch,
        getPlayerById,
        getTeamById,
        endMatch,
        router,
        showActionSheetWithOptions,
        handleInningsEnd: handleInningsEndCallback,
      });
    },
    [currentMatch, updateLiveMatch, setLiveMatch, getPlayerById, getTeamById, endMatch, router, showActionSheetWithOptions, handleInningsEndCallback]
  );

  // Memoized callback for scoring
  const handleScoreCallback = useCallback(
    (runs: number, extraType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye', matchData?: CricketMatch) => {
      const match = matchData || currentMatch;
      if (!match) return;

      scoreEngineHandleScore(runs, extraType, {
        currentMatch: match,
        updateLiveMatch,
        setLiveMatch,
        getTeamById,
        handleInningsEnd: handleInningsEndCallback,
        selectNewBowler: selectNewBowlerCallback,
        setLastBalls,
      });
    },
    [currentMatch, updateLiveMatch, setLiveMatch, getTeamById, handleInningsEndCallback, selectNewBowlerCallback, setLastBalls]
  );

  // Memoized callback for handling extras
  const handleExtraCallback = useCallback(
    (type: 'wide' | 'no_ball' | 'bye' | 'leg_bye') => {
      scoreEngineHandleExtra(type, {
        showActionSheetWithOptions,
        handleScore: handleScoreCallback,
        setExtraType,
        setShowExtraRunsInput,
      });
    },
    [handleScoreCallback, showActionSheetWithOptions, setExtraType, setShowExtraRunsInput]
  );

  // Memoized callback for undo
  const handleUndoCallback = useCallback(() => {
    scoreEngineHandleUndo(lastBalls.length, setLastBalls, (title, message, buttons) => {
      Alert.alert(title, message, buttons);
    });
  }, [lastBalls.length, setLastBalls]);

  // Memoized callback for swapping strike
  const swapStrikeCallback = useCallback(() => {
    swapStrike(currentMatch, {
      currentMatch,
      updateLiveMatch,
      setLiveMatch,
      getPlayerById,
      getTeamById,
      endMatch,
      router,
      showActionSheetWithOptions,
      handleInningsEnd: handleInningsEndCallback,
    });
  }, [currentMatch, updateLiveMatch, setLiveMatch, getPlayerById, getTeamById, endMatch, router, showActionSheetWithOptions, handleInningsEndCallback]);

  // Memoized callback for ending match
  const handleEndMatchCallback = useCallback(() => {
    inningsHandleEndMatch(currentMatch, {
      currentMatch,
      updateLiveMatch,
      setLiveMatch,
      getPlayerById,
      getTeamById,
      endMatch,
      router,
      showActionSheetWithOptions,
      handleInningsEnd: handleInningsEndCallback,
    }, (title, message, buttons) => {
      Alert.alert(title, message, buttons);
    });
  }, [currentMatch, updateLiveMatch, setLiveMatch, getPlayerById, getTeamById, endMatch, router, showActionSheetWithOptions, handleInningsEndCallback]);

  // Memoized callback for handling wicket
  const handleWicketCallback = useCallback(() => {
    handleWicket({
      currentMatch,
      updateLiveMatch,
      setLiveMatch,
      getPlayerById,
      getTeamById,
      showActionSheetWithOptions,
      handleInningsEnd: handleInningsEndCallback,
    }, showActionSheetWithOptions);
  }, [currentMatch, updateLiveMatch, setLiveMatch, getPlayerById, getTeamById, showActionSheetWithOptions, handleInningsEndCallback]);

  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>No active match</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const currentInnings = currentMatch.innings[currentMatch.currentInnings - 1];
  const battingTeam = getTeamById(currentInnings.battingTeam);
  const bowlingTeam = getTeamById(currentInnings.bowlingTeam);
  const striker = getPlayerById(currentInnings.currentStriker || '');
  const nonStriker = getPlayerById(currentInnings.currentNonStriker || '');
  const bowler = getPlayerById(currentInnings.currentBowler || '');

  const strikerScore = currentInnings.batsmen.find(b => b.playerId === currentInnings.currentStriker);
  const nonStrikerScore = currentInnings.batsmen.find(b => b.playerId === currentInnings.currentNonStriker);
  const bowlerStats = currentInnings.bowlers.find(b => b.playerId === currentInnings.currentBowler);

  return (
    <View style={styles.container}>
      <Modal visible={showExtraRunsInput} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Enter additional runs</Text>

            <TextInput
              keyboardType="numeric"
              value={extraRunsInput}
              onChangeText={setExtraRunsInput}
              placeholder="Runs"
              style={styles.modalInput}
              placeholderTextColor={Colors.textSecondary}
            />

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                const runs = parseInt(extraRunsInput) || 0;

                if (extraType) {
                  handleScoreCallback(runs, extraType);
                }

                setShowExtraRunsInput(false);
                setExtraRunsInput('');
                setExtraType(null);
              }}
            >
              <Text>Add Runs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={handleEndMatchCallback} style={styles.closeBtn}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {battingTeam?.shortName} vs {bowlingTeam?.shortName}
          </Text>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleUndoCallback} style={styles.undoBtn}>
          <RotateCcw size={20} color={Colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.scoreBoard}>
          <Text style={styles.teamName}>{battingTeam?.name}</Text>
          <View style={styles.mainScore}>
            <Text style={styles.runs}>{currentInnings.runs}</Text>
            <Text style={styles.wickets}>/{currentInnings.wickets}</Text>
          </View>
          <Text style={styles.overs}>
            ({currentInnings.overs}.{currentInnings.balls} / {currentMatch.totalOvers} ov)
          </Text>
          <Text style={styles.crr}>
            CRR: {((currentInnings.runs / (currentInnings.overs + currentInnings.balls / 6)) || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.playersContainer}>
          <View style={styles.batsmenRow}>
            <View style={[styles.playerCard, styles.strikerCard]}>
              <View style={styles.strikerBadge}>
                <Text style={styles.strikerBadgeText}>*</Text>
              </View>
              <Text style={styles.playerName}>{striker?.name || 'Select'}</Text>
              <Text style={styles.playerStats}>
                {strikerScore?.runs || 0} ({strikerScore?.balls || 0})
              </Text>
            </View>
            <TouchableOpacity style={styles.swapBtn} onPress={swapStrikeCallback}>
              <ArrowLeftRight size={18} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.playerCard}>
              <Text style={styles.playerName}>{nonStriker?.name || 'Select'}</Text>
              <Text style={styles.playerStats}>
                {nonStrikerScore?.runs || 0} ({nonStrikerScore?.balls || 0})
              </Text>
            </View>
          </View>

          <View style={styles.bowlerCard}>
            <Text style={styles.bowlerLabel}>Bowler</Text>
            <Text style={styles.playerName}>{bowler?.name || 'Select'}</Text>
            <Text style={styles.playerStats}>
              {bowlerStats?.overs || 0}.{bowlerStats?.balls || 0} - {bowlerStats?.runs || 0} -{' '}
              {bowlerStats?.wickets || 0}
            </Text>
            <TouchableOpacity
              style={styles.changeBowlerBtn}
              onPress={() =>
                selectNewBowlerCallback({
                  innings: { ...currentMatch.innings[currentMatch.currentInnings - 1] },
                  updatedMatch: currentMatch,
                  bowlingPlayers:
                    currentMatch.currentInnings === 1
                      ? currentMatch.playingXI_B.map((p: string) => {
                          return getPlayerById(p);
                        })
                      : currentMatch.playingXI_A.map((p: string) => {
                          return getPlayerById(p);
                        }),
                })
              }
            >
              <Text style={styles.changeBowlerText}>Change Bowler</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.thisOver}>
          <Text style={styles.thisOverLabel}>This Over</Text>
          <View style={styles.ballsRow}>
            {lastBalls.slice(-6).map((ball, i) => (
              <View
                key={i}
                style={[
                  styles.ballItem,
                  ball.isWicket && styles.ballWicket,
                  ball.extraType && styles.ballExtra,
                ]}
              >
                <Text style={styles.ballText}>
                  {ball.isWicket ? 'W' : ball.extraType ? `${ball.runs}${ball.extraType === 'wide' ? 'Wd' : 'Nb'}` : ball.runs}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.scoringPad}>
        <View style={styles.runsRow}>
          {runButtons.map((btn) => (
            <TouchableOpacity
              key={btn.value}
              style={[styles.runBtn, { backgroundColor: btn.color }]}
              onPress={() => handleScoreCallback(btn.value)}
            >
              <Text style={styles.runBtnText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.extrasRow}>
          {extraButtons.map((btn) => (
            <TouchableOpacity
              key={btn.type}
              style={[styles.extraBtn, { backgroundColor: btn.color }]}
              onPress={() => handleExtraCallback(btn.type)}
            >
              <Text style={[styles.extraBtnText]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.outRow}>
          <TouchableOpacity
            style={[styles.extraBtn, { backgroundColor: Colors.error }]}
            onPress={() => handleWicketCallback()}
          >
            <Text style={[styles.extraBtnText, styles.outBtnText]}>OUT</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={false} animationType="slide">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Modal Content</Text>
            <Button title="Close" />
          </View>
        </Modal>
      </SafeAreaView>
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
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  errorBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },

  modalTitle: {
    color: Colors.text,
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContainer: {
    width: '80%',
    backgroundColor: Colors.border,
    padding: 20,
    borderRadius: 12,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: Colors.text,
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
    color: Colors.text,
  },

  modalBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.live,
    letterSpacing: 1,
  },
  undoBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  scoreBoard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  teamName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  mainScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  runs: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  wickets: {
    fontSize: 32,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  overs: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  crr: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '600' as const,
  },
  playersContainer: {
    marginBottom: 16,
  },
  batsmenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  playerCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  strikerCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  strikerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  strikerBadgeText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  swapBtn: {
    padding: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  playerStats: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  changeBowlerBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  changeBowlerText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  bowlerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  bowlerLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  thisOver: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
  },
  thisOverLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  ballsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ballItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballWicket: {
    backgroundColor: Colors.error,
  },
  ballExtra: {
    backgroundColor: Colors.warning,
  },
  ballText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scoringPad: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  runsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  runBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runBtnText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: 10,
  },

  outRow: {
    flexDirection: 'row',
    marginTop: 10,
  },

  extraBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  outBtnText: {
    color: Colors.text,
  },
});
