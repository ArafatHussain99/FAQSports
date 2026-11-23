import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, RotateCcw, ArrowLeftRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';
import { useCricketMatches } from '../context';
import { BallEvent, CricketMatch } from '../types';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { handleScore as scoreEngineHandleScore, handleExtra as scoreEngineHandleExtra, handleUndo as scoreEngineHandleUndo } from '../engines/scoreEngine';
import { handleInningsEnd, selectNewBowler, swapStrike, handleEndMatch as inningsHandleEndMatch } from '../engines/inningsEngine';
import { handleWicket } from '../engines/wicketEngine';

const runButtons = [
  { value: 0, label: '0', boundary: false },
  { value: 1, label: '1', boundary: false },
  { value: 2, label: '2', boundary: false },
  { value: 3, label: '3', boundary: false },
  { value: 4, label: '4', boundary: true },
  { value: 6, label: '6', boundary: true },
];

const extraButtons = [
  { type: 'wide' as const, label: 'Wide' },
  { type: 'no_ball' as const, label: 'No ball' },
  { type: 'bye' as const, label: 'Bye' },
  { type: 'leg_bye' as const, label: 'Leg bye' },
];

export default function LiveScoringScreen() {
  const router = useRouter();
  const { currentMatch, updateLiveMatch, endMatch, setLiveMatch } = useCricketMatches();
  const { getPlayerById, getTeamById } = useData();
  const [lastBalls, setLastBalls] = useState<BallEvent[]>([]);
  const { showActionSheetWithOptions: rawShowActionSheet } = useActionSheet();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // On Android and web the action sheet (wicket type, new batsman, new bowler,
  // extras...) is drawn in JS flush against the bottom of the screen, so its
  // last options sat under the home indicator / navigation bar. Pad it by the
  // bottom inset and cap its height below the status bar so long player lists
  // scroll instead of running off the top. iOS uses the native sheet and
  // ignores containerStyle.
  const showActionSheetWithOptions = useCallback(
    (config: any, callback: (index?: number) => void) => {
      rawShowActionSheet(
        {
          ...config,
          containerStyle: [
            {
              paddingBottom: insets.bottom,
              maxHeight: windowHeight - insets.top - 24,
            },
            config?.containerStyle,
          ],
        },
        callback
      );
    },
    [rawShowActionSheet, insets.bottom, insets.top, windowHeight]
  );

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
        getPlayerById,
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
          <Text style={styles.errorHint}>Start a match from Home to score it here.</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go back</Text>
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
          <View style={[styles.modalContainer, { paddingBottom: Space.xl + insets.bottom }]}>
            <Text style={styles.modalTitle}>Additional runs</Text>
            <Text style={styles.modalHint}>Runs taken on top of the extra.</Text>

            <TextInput
              keyboardType="numeric"
              value={extraRunsInput}
              onChangeText={setExtraRunsInput}
              placeholder="0"
              style={styles.modalInput}
              placeholderTextColor={Colors.textMuted}
              autoFocus
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
              <Text style={styles.modalBtnText}>Add runs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity
          onPress={handleEndMatchCallback}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="End match"
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {battingTeam?.shortName} v {bowlingTeam?.shortName}
          </Text>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleUndoCallback}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Undo last ball"
        >
          <RotateCcw size={22} color={Colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.scoreBoard}>
          <View style={styles.teamLine}>
            {battingTeam && <View style={[styles.pin, { backgroundColor: battingTeam.color }]} />}
            <Text style={styles.teamName} numberOfLines={1}>{battingTeam?.name}</Text>
          </View>
          <View style={styles.mainScore}>
            <Text style={styles.runs}>{currentInnings.runs}</Text>
            <Text style={styles.wickets}>/{currentInnings.wickets}</Text>
          </View>
          <Text style={styles.overs}>
            {currentInnings.overs}.{currentInnings.balls} of {currentMatch.totalOvers} overs
            <Text style={styles.crr}>
              {'   '}Run rate {((currentInnings.runs / (currentInnings.overs + currentInnings.balls / 6)) || 0).toFixed(2)}
            </Text>
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Batting</Text>
          <View style={[styles.playerRow, styles.strikerRow]}>
            <Text style={styles.strikerMark}>*</Text>
            <Text style={styles.playerName} numberOfLines={1}>{striker?.name || 'Select'}</Text>
            <Text style={styles.playerRuns}>{strikerScore?.runs || 0}</Text>
            <Text style={styles.playerBalls}>({strikerScore?.balls || 0})</Text>
          </View>
          <View style={styles.playerRow}>
            <Text style={styles.strikerMarkEmpty}> </Text>
            <Text style={styles.playerName} numberOfLines={1}>{nonStriker?.name || 'Select'}</Text>
            <Text style={styles.playerRuns}>{nonStrikerScore?.runs || 0}</Text>
            <Text style={styles.playerBalls}>({nonStrikerScore?.balls || 0})</Text>
          </View>
          <TouchableOpacity
            style={styles.textBtn}
            onPress={swapStrikeCallback}
            accessibilityRole="button"
            accessibilityLabel="Swap strike"
          >
            <ArrowLeftRight size={18} color={Colors.primary} />
            <Text style={styles.textBtnText}>Swap strike</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Bowling</Text>
          <View style={styles.playerRow}>
            <Text style={styles.strikerMarkEmpty}> </Text>
            <Text style={styles.playerName} numberOfLines={1}>{bowler?.name || 'Select'}</Text>
            <Text style={styles.bowlerFigures}>
              {bowlerStats?.overs || 0}.{bowlerStats?.balls || 0}-{bowlerStats?.runs || 0}-{bowlerStats?.wickets || 0}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.textBtn}
            accessibilityRole="button"
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
            <Text style={styles.textBtnText}>Change bowler</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>This over</Text>
          <View style={styles.ballsRow}>
            {lastBalls.length === 0 && <Text style={styles.noBalls}>No balls bowled yet</Text>}
            {lastBalls.slice(-6).map((ball, i) => {
              const isBoundary = !ball.isWicket && !ball.extraType && (ball.runs === 4 || ball.runs === 6);
              return (
                <View
                  key={i}
                  style={[
                    styles.ballItem,
                    isBoundary && styles.ballBoundary,
                    ball.extraType && styles.ballExtra,
                    ball.isWicket && styles.ballWicket,
                  ]}
                >
                  <Text
                    style={[
                      styles.ballText,
                      (isBoundary || ball.isWicket) && styles.ballTextInverse,
                      ball.extraType && !ball.isWicket && styles.ballTextExtra,
                    ]}
                  >
                    {ball.isWicket ? 'W' : ball.extraType ? `${ball.runs}${ball.extraType === 'wide' ? 'Wd' : 'Nb'}` : ball.runs}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.scoringPad}>
        <View style={styles.runsRow}>
          {runButtons.map((btn) => (
            <TouchableOpacity
              key={btn.value}
              style={[styles.runBtn, btn.boundary && styles.runBtnBoundary]}
              onPress={() => handleScoreCallback(btn.value)}
              accessibilityRole="button"
              accessibilityLabel={`${btn.value} ${btn.value === 1 ? 'run' : 'runs'}`}
            >
              <Text style={[styles.runBtnText, btn.boundary && styles.runBtnTextBoundary]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.extrasRow}>
          {extraButtons.map((btn) => (
            <TouchableOpacity
              key={btn.type}
              style={styles.extraBtn}
              onPress={() => handleExtraCallback(btn.type)}
              accessibilityRole="button"
            >
              <Text style={styles.extraBtnText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.outBtn}
          onPress={() => handleWicketCallback()}
          accessibilityRole="button"
          accessibilityLabel="Wicket"
        >
          <Text style={styles.outBtnText}>OUT</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
  },
  errorText: {
    ...Type.title,
    color: Colors.text,
  },
  errorHint: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.xs,
    textAlign: 'center',
  },
  errorBtn: {
    marginTop: Space.xl,
    minHeight: Touch,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
  },
  errorBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.scrim,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
  },
  modalTitle: {
    ...Type.title,
    color: Colors.text,
  },
  modalHint: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  modalInput: {
    ...Type.scoreM,
    color: Colors.text,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 56,
    paddingHorizontal: Space.lg,
    marginTop: Space.lg,
  },
  modalBtn: {
    marginTop: Space.md,
    height: Touch + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.sm,
    paddingBottom: Space.xs,
    backgroundColor: Colors.surface,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  iconBtn: {
    width: Touch,
    height: Touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  headerTitle: {
    ...Type.headline,
    color: Colors.text,
    flexShrink: 1,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    borderWidth: 1,
    borderColor: Colors.live,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.live,
  },
  liveText: {
    ...Type.tag,
    color: Colors.live,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Space.xl,
    paddingBottom: Space.xl,
  },
  scoreBoard: {
    paddingTop: Space.lg,
    paddingBottom: Space.md,
  },
  teamLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    ...Type.headline,
    color: Colors.text,
    flexShrink: 1,
  },
  mainScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  runs: {
    ...Type.scoreXL,
    fontSize: 72,
    lineHeight: 78,
    color: Colors.text,
  },
  wickets: {
    ...Type.scoreL,
    color: Colors.textSecondary,
  },
  overs: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  crr: {
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  block: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
    paddingTop: Space.sm,
    paddingBottom: Space.xs,
  },
  blockLabel: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginBottom: Space.xxs,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minHeight: 40,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.sm,
    marginHorizontal: -Space.sm,
    borderRadius: Radius.xs,
  },
  strikerRow: {
    backgroundColor: Colors.highlight,
  },
  strikerMark: {
    ...Type.headline,
    width: 16,
    color: Colors.onHighlight,
  },
  strikerMarkEmpty: {
    ...Type.headline,
    width: 16,
  },
  playerName: {
    ...Type.headline,
    color: Colors.text,
    flex: 1,
  },
  playerRuns: {
    ...Type.scoreM,
    color: Colors.text,
  },
  playerBalls: {
    ...Type.footnote,
    color: Colors.textSecondary,
    width: 44,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  bowlerFigures: {
    ...Type.number,
    fontSize: 18,
    color: Colors.text,
  },
  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Space.xs + 2,
    minHeight: 44,
  },
  textBtnText: {
    ...Type.subhead,
    fontWeight: '700',
    color: Colors.primary,
  },
  ballsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    paddingVertical: Space.sm,
    minHeight: 56,
    alignItems: 'center',
  },
  noBalls: {
    ...Type.subhead,
    color: Colors.textMuted,
  },
  ballItem: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: Space.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballBoundary: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  ballExtra: {
    borderColor: Colors.warning,
  },
  ballWicket: {
    backgroundColor: Colors.live,
    borderColor: Colors.live,
  },
  ballText: {
    ...Type.number,
    fontSize: 14,
    color: Colors.text,
  },
  ballTextInverse: {
    color: Colors.textInverse,
  },
  ballTextExtra: {
    color: Colors.warning,
  },
  scoringPad: {
    backgroundColor: Colors.surface,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
    paddingHorizontal: Space.md,
    paddingTop: Space.md,
    gap: Space.sm,
  },
  runsRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  runBtn: {
    flex: 1,
    height: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runBtnBoundary: {
    backgroundColor: Colors.ink,
  },
  runBtnText: {
    ...Type.scoreM,
    color: Colors.text,
  },
  runBtnTextBoundary: {
    color: Colors.textInverse,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  extraBtn: {
    flex: 1,
    height: Touch,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraBtnText: {
    ...Type.subhead,
    fontWeight: '700',
    color: Colors.warning,
  },
  outBtn: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.live,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.md,
  },
  outBtnText: {
    ...Type.headline,
    fontSize: 18,
    letterSpacing: 1.5,
    color: Colors.textInverse,
  },
});
