import { isPermissionError, PERMISSION_ERROR_MESSAGE } from '@/api/supabaseClient';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { MatchStatus, Player } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { RotateCcw, Trash2, Trophy } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTableTennisMatch } from '../api';
import { tableTennisMatchKey, useTableTennisMatches } from '../context';
import {
  addPoint,
  computeMatchState,
  getGameSetup,
  setGameSetup,
  undoPoint,
} from '../engines/scoreEngine';
import {
  TableTennisMatch,
  TableTennisMatchUpdate,
  TTGameSetup,
  TTMatchConfig,
  TTPoint,
  TTSide,
} from '../types';
import { playerName, teamLabel } from '../utils';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Snapshot = {
  status: MatchStatus;
  points: TTPoint[];
  gameSetups: TTGameSetup[];
  winner: TTSide | null;
  startedAt: string | null;
  completedAt: string | null;
};

const tapFeedback = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};

export default function TableTennisScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useApp();
  const { players } = useData();
  const { saveMatch, deleteMatch } = useTableTennisMatches();

  const matchQuery = useQuery({
    queryKey: tableTennisMatchKey(id ?? ''),
    queryFn: () => getTableTennisMatch(id!),
    enabled: !!id,
    // Viewers follow a live match; the scorer's device holds the source of truth.
    refetchInterval: query =>
      !isAdmin && query.state.data?.status === 'live' ? 10 * 1000 : false,
  });
  const match = matchQuery.data ?? null;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveErrorText, setSaveErrorText] = useState('Not saved. Tap to retry.');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hydratedId = useRef<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const latest = useRef<Snapshot | null>(null);

  // Admins load the match once and then own it locally; viewers follow the server.
  useEffect(() => {
    if (!match) return;
    if (isAdmin && hydratedId.current === match.id) return;
    hydratedId.current = match.id;
    const next: Snapshot = {
      status: match.status,
      points: match.points,
      gameSetups: match.gameSetups,
      winner: match.winner,
      startedAt: match.startedAt,
      completedAt: match.completedAt,
    };
    latest.current = next;
    setSnapshot(next);
  }, [match, isAdmin]);

  const persist = useCallback(
    (next: Snapshot, update: TableTennisMatchUpdate) => {
      if (!id || !match) return;
      latest.current = next;
      setSnapshot(next);
      queryClient.setQueryData<TableTennisMatch | null>(tableTennisMatchKey(id), prev =>
        prev ? { ...prev, ...next } : prev,
      );
      setSaveState('saving');
      // Chain saves so they reach Supabase in order.
      saveQueue.current = saveQueue.current
        .then(() => saveMatch(id, update))
        .then(() => setSaveState('saved'))
        .catch(e => {
          setSaveErrorText(
            isPermissionError(e) ? `Not saved. ${PERMISSION_ERROR_MESSAGE}` : 'Not saved. Tap to retry.',
          );
          setSaveState('error');
        });
    },
    [id, match, queryClient, saveMatch],
  );

  const retrySave = () => {
    const current = latest.current;
    if (!current) return;
    persist(current, { ...current });
  };

  if (!id) {
    return <Message title="Match not found" />;
  }

  if (matchQuery.isLoading || (match && !snapshot)) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Table Tennis' }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (matchQuery.error) {
    return (
      <Message
        title="Couldn't load this match"
        subtitle="Check your connection and try again."
        action={{ label: 'Retry', onPress: () => matchQuery.refetch() }}
      />
    );
  }

  if (!match || !snapshot) {
    return <Message title="Match not found" subtitle="It may have been deleted." />;
  }

  const config: TTMatchConfig = match;
  const state = computeMatchState(config, snapshot.gameSetups, snapshot.points);
  const canScore = isAdmin && snapshot.status === 'live';
  const nameA = teamLabel(players, config.teamA, false);
  const nameB = teamLabel(players, config.teamB, false);
  const sideName = (side: TTSide) => (side === 'A' ? nameA : nameB);

  const handlePoint = (side: TTSide) => {
    if (!canScore || state.matchOver) return;
    tapFeedback();
    // Lock in the setup used for this game so it survives later default changes.
    const gameSetups = setGameSetup(config, snapshot.gameSetups, state.currentGame, state.setup);
    const points = addPoint(config, gameSetups, snapshot.points, side);
    persist({ ...snapshot, points, gameSetups }, { points, gameSetups });
  };

  const handleUndo = () => {
    if (!canScore || snapshot.points.length === 0) return;
    tapFeedback();
    const points = undoPoint(snapshot.points);
    persist({ ...snapshot, points }, { points });
  };

  const handleSetupChange = (setup: TTGameSetup) => {
    const gameSetups = setGameSetup(config, snapshot.gameSetups, state.currentGame, setup);
    if (snapshot.status === 'upcoming') {
      // Not saved until the match starts.
      const next = { ...snapshot, gameSetups };
      latest.current = next;
      setSnapshot(next);
      return;
    }
    persist({ ...snapshot, gameSetups }, { gameSetups });
  };

  const handleStart = () => {
    const startedAt = new Date().toISOString();
    const gameSetups = setGameSetup(config, snapshot.gameSetups, 0, getGameSetup(config, snapshot.gameSetups, 0));
    persist(
      { ...snapshot, status: 'live', gameSetups, startedAt },
      { status: 'live', gameSetups, startedAt },
    );
  };

  const handleFinish = () => {
    if (!state.matchWinner) return;
    const completedAt = new Date().toISOString();
    persist(
      { ...snapshot, status: 'completed', winner: state.matchWinner, completedAt },
      { status: 'completed', winner: state.matchWinner, completedAt },
    );
  };

  const handleReopen = () => {
    persist(
      { ...snapshot, status: 'live', winner: null, completedAt: null },
      { status: 'live', winner: null, completedAt: null },
    );
  };

  const handleDelete = async () => {
    setActionError(null);
    try {
      await deleteMatch(match.id);
      router.back();
    } catch (e) {
      setActionError(isPermissionError(e) ? PERMISSION_ERROR_MESSAGE : "Couldn't delete the match. Try again.");
      setConfirmDelete(false);
    }
  };

  const atGameStart = state.scoreA + state.scoreB === 0;
  const lastGame = state.currentGame > 0 ? state.games[state.currentGame - 1] : null;
  const showPad = canScore && !state.matchOver;
  const showStartFooter = isAdmin && snapshot.status === 'upcoming';
  const hasFooter = showPad || showStartFooter;
  const tagColor = statusColor(snapshot.status);
  const finishedGames = state.games.filter(g => g.winner);

  return (
    <SafeAreaView edges={hasFooter ? [] : ['bottom']} style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Table Tennis',
          headerRight: canScore
            ? () => (
                <TouchableOpacity
                  onPress={handleUndo}
                  disabled={snapshot.points.length === 0}
                  style={[styles.iconBtn, snapshot.points.length === 0 && styles.disabled]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Undo last point"
                  accessibilityState={{ disabled: snapshot.points.length === 0 }}
                >
                  <RotateCcw size={22} color={Colors.text} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Match info */}
        <View style={styles.infoRow}>
          <View style={[styles.statusTag, { borderColor: tagColor }]}>
            <Text style={[styles.statusText, { color: tagColor }]}>
              {snapshot.status === 'completed' ? 'RESULT' : snapshot.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.infoText}>
            {config.format === 'double' ? 'Doubles' : 'Singles'} ·{' '}
            {config.bestOf === 1 ? '1 game' : `Best of ${config.bestOf}`} · to {config.pointsToWin} ·{' '}
            {config.servesPerTurn} serves each{match.venue ? ` · ${match.venue}` : ''}
          </Text>
        </View>
        {isAdmin && <SaveIndicator state={saveState} errorText={saveErrorText} onRetry={retrySave} />}

        {/* Before the match: who serves first and who starts on the right */}
        {snapshot.status === 'upcoming' && (
          <View>
            <Text style={styles.stepTitle}>Match setup</Text>
            <Text style={styles.vsLine}>
              {nameA} v {nameB}
            </Text>
            {isAdmin ? (
              <SetupEditor
                config={config}
                setup={state.setup}
                players={players}
                onChange={handleSetupChange}
              />
            ) : (
              <Text style={styles.mutedText}>This match hasn&apos;t started yet.</Text>
            )}
          </View>
        )}

        {snapshot.status !== 'upcoming' && (
          <>
            {/* Scoreboard: the side currently serving sits on the highlighter */}
            <View style={styles.scoreboard}>
              {(['A', 'B'] as TTSide[]).map(side => {
                const serving = !state.matchOver && state.servingSide === side && snapshot.status === 'live';
                const score = side === 'A' ? state.scoreA : state.scoreB;
                const gamesWon = side === 'A' ? state.gamesWonA : state.gamesWonB;
                const won = state.matchWinner === side;
                return (
                  <View
                    key={side}
                    style={[styles.scorePanel, serving && styles.scorePanelServing]}
                    accessible
                    accessibilityLabel={`${sideName(side)}: ${score} points, ${gamesWon} games${serving ? ', serving' : ''}`}
                  >
                    <Text style={[styles.panelName, serving && styles.onHighlight]} numberOfLines={2}>
                      {sideName(side)}
                    </Text>
                    <Text style={[styles.panelScore, serving && styles.onHighlight]}>{score}</Text>
                    <View style={styles.panelGamesRow}>
                      <Text style={[styles.panelGamesLabel, serving && styles.onHighlight]}>Games</Text>
                      <Text style={[styles.panelGames, serving && styles.onHighlight, won && styles.panelGamesWon]}>
                        {gamesWon}
                      </Text>
                    </View>
                    {serving ? (
                      <Text style={styles.servingTag}>SERVING</Text>
                    ) : (
                      <Text style={styles.servingTagEmpty}> </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Service info */}
            {!state.matchOver && snapshot.status === 'live' && (
              <View style={styles.block}>
                <View style={styles.blockHeader}>
                  <Text style={styles.sectionTitle}>Game {state.currentGame + 1}</Text>
                  {state.isDeuce && (
                    <View style={styles.deuceTag}>
                      <Text style={styles.deuceText}>{state.advantage ? 'ADVANTAGE' : 'DEUCE'}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.serviceRow, styles.serviceRowCurrent]}>
                  <Text style={styles.serviceRole}>Server</Text>
                  <Text style={[styles.serviceName, styles.onHighlight]} numberOfLines={1}>
                    {playerName(players, state.serverId)}
                  </Text>
                </View>
                <View style={styles.serviceRow}>
                  <Text style={styles.serviceRoleMuted}>Receiver</Text>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {playerName(players, state.receiverId)}
                  </Text>
                </View>
                <Text style={styles.mutedText}>
                  {state.servesLeft === 1 ? 'Last serve of this turn' : `${state.servesLeft} serves left in this turn`}
                  {state.isDeuce ? ' · service changes every point' : ''}
                </Text>
                {state.isDeuce && (
                  <Text style={styles.mutedText}>
                    {state.advantage
                      ? `${sideName(state.advantage)} wins the game with the next point.`
                      : 'Deuce: the first side to win 2 points in a row takes the game.'}
                  </Text>
                )}
                {config.format === 'double' && <Court state={state} players={players} />}
              </View>
            )}

            {/* Between games / before the first point: allow changing server */}
            {canScore && !state.matchOver && atGameStart && (
              <View style={styles.block}>
                {lastGame && (
                  <Text style={styles.gameEndedText}>
                    Game {state.currentGame} to {sideName(lastGame.winner ?? 'A')} ({lastGame.a}-{lastGame.b})
                  </Text>
                )}
                <Text style={styles.sectionTitle}>Game {state.currentGame + 1} setup</Text>
                <SetupEditor
                  config={config}
                  setup={state.setup}
                  players={players}
                  onChange={handleSetupChange}
                />
              </View>
            )}

            {/* Match result */}
            {state.matchOver && state.matchWinner && (
              <View style={styles.resultBlock}>
                <View style={styles.resultHeader}>
                  <Trophy size={20} color={Colors.completed} />
                  <View style={styles.winnerTag}>
                    <Text style={styles.winnerTagText}>WINNER</Text>
                  </View>
                </View>
                <Text style={styles.resultTitle}>{sideName(state.matchWinner)}</Text>
                <Text style={styles.resultSubtitle}>
                  Won {Math.max(state.gamesWonA, state.gamesWonB)}-{Math.min(state.gamesWonA, state.gamesWonB)} in games
                </Text>
                <View style={styles.resultGames}>
                  {finishedGames.map((game, i) => (
                    <Text key={i} style={styles.resultGame}>
                      {game.a}-{game.b}
                    </Text>
                  ))}
                </View>
                {canScore && (
                  <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
                    <Text style={styles.primaryButtonText}>Finish & Save Result</Text>
                  </TouchableOpacity>
                )}
                {isAdmin && snapshot.status === 'completed' && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleReopen}>
                    <Text style={styles.secondaryButtonText}>Reopen for corrections</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Game-by-game scorecard */}
            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Scorecard</Text>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableName, styles.tableHeader]}>Player</Text>
                  {state.games.length === 0 && <Text style={[styles.tableCell, styles.tableHeader]}>G1</Text>}
                  {state.games.map((_, i) => (
                    <Text key={i} style={[styles.tableCell, styles.tableHeader]}>G{i + 1}</Text>
                  ))}
                  <Text style={[styles.tableCell, styles.tableGames, styles.tableHeader]}>Games</Text>
                </View>
                {(['A', 'B'] as TTSide[]).map(side => (
                  <View key={side} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableName]} numberOfLines={1}>
                      {teamLabel(players, side === 'A' ? config.teamA : config.teamB)}
                    </Text>
                    {state.games.length === 0 && <Text style={styles.tableCell}>0</Text>}
                    {state.games.map((game, i) => (
                      <Text key={i} style={[styles.tableCell, game.winner === side && styles.tableWin]}>
                        {side === 'A' ? game.a : game.b}
                      </Text>
                    ))}
                    <Text style={[styles.tableCell, styles.tableGames, styles.tableWin]}>
                      {side === 'A' ? state.gamesWonA : state.gamesWonB}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Admin: delete */}
        {isAdmin && (
          <View style={styles.deleteArea}>
            {actionError && <Text style={styles.errorText}>{actionError}</Text>}
            {confirmDelete ? (
              <View style={styles.confirmRow}>
                <Text style={styles.mutedText}>Delete this match and its scores?</Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity style={styles.secondaryButtonSmall} onPress={() => setConfirmDelete(false)}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
                    <Text style={styles.dangerButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.deleteLink} onPress={() => setConfirmDelete(true)}>
                <Trash2 size={18} color={Colors.error} />
                <Text style={styles.deleteText}>Delete match</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Admin scoring keys: one per side */}
      {showPad && (
        <SafeAreaView edges={['bottom']} style={styles.pad}>
          <View style={styles.padRow}>
            {(['A', 'B'] as TTSide[]).map(side => (
              <Pressable
                key={side}
                onPress={() => handlePoint(side)}
                style={({ pressed }) => [styles.pointKey, pressed && styles.pointKeyPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Point to ${sideName(side)}`}
              >
                {({ pressed }) => (
                  <>
                    <Text style={[styles.pointKeyLabel, pressed && styles.pointKeyTextPressed]}>+1 point</Text>
                    <Text
                      style={[styles.pointKeyName, pressed && styles.pointKeyTextPressed]}
                      numberOfLines={1}
                    >
                      {sideName(side)}
                    </Text>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      )}

      {/* Before the match: start footer */}
      {showStartFooter && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity style={styles.primaryButtonFooter} onPress={handleStart}>
            <Text style={styles.primaryButtonText}>Start Match</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const statusColor = (status: MatchStatus) =>
  status === 'live'
    ? Colors.live
    : status === 'upcoming'
      ? Colors.upcoming
      : status === 'completed'
        ? Colors.completed
        : Colors.cancelled;

function SaveIndicator({
  state,
  errorText,
  onRetry,
}: {
  state: SaveState;
  errorText: string;
  onRetry: () => void;
}) {
  if (state === 'idle') return null;
  if (state === 'error') {
    return (
      <TouchableOpacity style={styles.saveRow} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.errorText}>{errorText}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.saveRow}>
      <Text style={styles.mutedText}>{state === 'saving' ? 'Saving…' : 'All changes saved'}</Text>
    </View>
  );
}

function SetupEditor({
  config,
  setup,
  players,
  onChange,
}: {
  config: TTMatchConfig;
  setup: TTGameSetup;
  players: Player[];
  onChange: (setup: TTGameSetup) => void;
}) {
  const isDoubles = config.format === 'double';
  return (
    <View>
      <Text style={styles.label}>Serves first</Text>
      <View style={styles.chipRow}>
        {(['A', 'B'] as TTSide[]).map(side => (
          <Chip
            key={side}
            label={teamLabel(players, side === 'A' ? config.teamA : config.teamB)}
            active={setup.firstServer === side}
            onPress={() => onChange({ ...setup, firstServer: side })}
          />
        ))}
      </View>

      {isDoubles &&
        (['A', 'B'] as TTSide[]).map(side => {
          const team = side === 'A' ? config.teamA : config.teamB;
          const right = side === 'A' ? setup.rightA : setup.rightB;
          return (
            <View key={side}>
              <Text style={styles.label}>
                {side === 'A' ? 'Team A' : 'Team B'}: starts on the right
                {setup.firstServer === side ? ' (serves first)' : ' (receives first)'}
              </Text>
              <View style={styles.chipRow}>
                {team.map(pid => (
                  <Chip
                    key={pid}
                    label={playerName(players, pid, true)}
                    active={right === pid}
                    onPress={() =>
                      onChange(side === 'A' ? { ...setup, rightA: pid } : { ...setup, rightB: pid })
                    }
                  />
                ))}
              </View>
            </View>
          );
        })}
      {isDoubles && (
        <Text style={[styles.mutedText, styles.setupHint]}>
          The player on the right serves {config.servesPerTurn} times, then swaps sides with their
          partner and service passes to the other team&apos;s player on the right.
        </Text>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Doubles court seen from the side: Team B at the top, Team A at the bottom.
 * Each team's right-hand side is diagonally opposite the other team's right,
 * so the serve goes from the server's cell to the receiver's cell.
 */
function Court({
  state,
  players,
}: {
  state: ReturnType<typeof computeMatchState>;
  players: Player[];
}) {
  const cell = (id: string | null, label: string) => {
    const isServer = id === state.serverId;
    const isReceiver = id === state.receiverId;
    return (
      <View style={[styles.courtCell, isServer && styles.courtServer, isReceiver && styles.courtReceiver]}>
        <Text style={[styles.courtName, isServer && styles.onHighlight]} numberOfLines={1}>
          {playerName(players, id, true)}
        </Text>
        <Text style={[styles.courtLabel, isServer && styles.onHighlight]}>
          {isServer ? 'Serving' : isReceiver ? 'Receiving' : label}
        </Text>
      </View>
    );
  };
  return (
    <View style={styles.court}>
      <View style={styles.courtRow}>
        {cell(state.positions.B.right, 'Right')}
        {cell(state.positions.B.left, 'Left')}
      </View>
      <View style={styles.net} />
      <View style={styles.courtRow}>
        {cell(state.positions.A.left, 'Left')}
        {cell(state.positions.A.right, 'Right')}
      </View>
    </View>
  );
}

function Message({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.center}>
      <Stack.Screen options={{ title: 'Table Tennis' }} />
      <Text style={styles.messageTitle}>{title}</Text>
      {subtitle && <Text style={styles.messageSubtitle}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={styles.primaryButton} onPress={action.onPress}>
          <Text style={styles.primaryButtonText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.xxxl,
    gap: Space.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space.xxl,
    gap: Space.sm,
    backgroundColor: Colors.background,
  },
  messageTitle: {
    ...Type.title,
    color: Colors.text,
    textAlign: 'center',
  },
  messageSubtitle: {
    ...Type.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  infoText: {
    ...Type.footnote,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
  },
  statusText: {
    ...Type.tag,
  },
  saveRow: {
    alignItems: 'flex-end',
    minHeight: 20,
    justifyContent: 'center',
  },
  stepTitle: {
    ...Type.title,
    color: Colors.text,
    marginTop: Space.sm,
  },
  vsLine: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  sectionTitle: {
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
  setupHint: {
    marginTop: Space.md,
  },
  mutedText: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  errorText: {
    ...Type.footnote,
    fontWeight: '600',
    color: Colors.error,
  },
  onHighlight: {
    color: Colors.onHighlight,
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
    maxWidth: '100%',
  },
  chipActive: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.ink,
  },
  chipText: {
    ...Type.bodyStrong,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.onHighlight,
  },
  primaryButton: {
    marginTop: Space.md,
    height: Touch,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    alignSelf: 'stretch',
  },
  primaryButtonFooter: {
    height: Touch,
    marginBottom: Space.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    marginTop: Space.sm,
    height: Touch,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
    alignSelf: 'stretch',
  },
  secondaryButtonSmall: {
    height: Touch,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  secondaryButtonText: {
    ...Type.headline,
    color: Colors.text,
  },
  dangerButton: {
    height: Touch,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    justifyContent: 'center',
    backgroundColor: Colors.error,
  },
  dangerButtonText: {
    ...Type.headline,
    color: Colors.textInverse,
  },
  scoreboard: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.xs,
  },
  scorePanel: {
    flex: 1,
    paddingVertical: Space.md,
    paddingHorizontal: Space.md,
    borderRadius: Radius.xs,
    alignItems: 'center',
  },
  scorePanelServing: {
    backgroundColor: Colors.highlight,
  },
  panelName: {
    ...Type.headline,
    color: Colors.text,
    textAlign: 'center',
    minHeight: 44,
  },
  panelScore: {
    ...Type.scoreXL,
    color: Colors.text,
    marginVertical: Space.xs,
  },
  panelGamesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space.xs + 2,
  },
  panelGamesLabel: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  panelGames: {
    ...Type.number,
    fontSize: 20,
    color: Colors.text,
  },
  panelGamesWon: {
    color: Colors.completed,
  },
  servingTag: {
    ...Type.tag,
    marginTop: Space.sm,
    color: Colors.onHighlight,
  },
  servingTagEmpty: {
    ...Type.tag,
    marginTop: Space.sm,
  },
  block: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
    paddingTop: Space.lg,
    gap: Space.xs,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deuceTag: {
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
    marginBottom: Space.sm,
  },
  deuceText: {
    ...Type.tag,
    color: Colors.warning,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: Space.sm,
    marginHorizontal: -Space.sm,
    borderRadius: Radius.xs,
    gap: Space.md,
  },
  serviceRowCurrent: {
    backgroundColor: Colors.highlight,
  },
  serviceRole: {
    ...Type.footnote,
    color: Colors.onHighlight,
    width: 64,
  },
  serviceRoleMuted: {
    ...Type.footnote,
    color: Colors.textSecondary,
    width: 64,
  },
  serviceName: {
    ...Type.headline,
    color: Colors.text,
    flex: 1,
  },
  court: {
    marginTop: Space.md,
    borderWidth: 1,
    borderColor: Colors.ink,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  courtRow: {
    flexDirection: 'row',
  },
  courtCell: {
    flex: 1,
    paddingVertical: Space.md,
    paddingHorizontal: Space.xs + 2,
    alignItems: 'center',
    borderWidth: Hairline,
    borderColor: Colors.border,
  },
  courtServer: {
    backgroundColor: Colors.highlight,
  },
  courtReceiver: {
    backgroundColor: Colors.surfaceLight,
  },
  courtName: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  courtLabel: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  net: {
    height: 2,
    backgroundColor: Colors.ink,
  },
  gameEndedText: {
    ...Type.subhead,
    fontWeight: '700',
    color: Colors.completed,
    marginBottom: Space.xs,
  },
  resultBlock: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Space.lg,
    gap: Space.xs,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  winnerTag: {
    borderWidth: 1,
    borderColor: Colors.completed,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 1,
  },
  winnerTagText: {
    ...Type.tag,
    color: Colors.completed,
  },
  resultTitle: {
    ...Type.title,
    color: Colors.text,
    marginTop: Space.xs,
  },
  resultSubtitle: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  resultGames: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.lg,
    marginTop: Space.sm,
    paddingTop: Space.sm,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  resultGame: {
    ...Type.number,
    color: Colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  table: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  tableCell: {
    ...Type.number,
    fontSize: 14,
    width: 36,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  tableName: {
    ...Type.subhead,
    flex: 1,
    width: undefined,
    textAlign: 'left',
    color: Colors.text,
  },
  tableGames: {
    width: 52,
    textAlign: 'right',
  },
  tableHeader: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  tableWin: {
    color: Colors.text,
    fontWeight: '800',
  },
  deleteArea: {
    marginTop: Space.section,
    alignItems: 'center',
    gap: Space.sm,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    minHeight: 44,
    paddingHorizontal: Space.sm,
  },
  deleteText: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.error,
  },
  confirmRow: {
    alignItems: 'center',
    gap: Space.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: Space.md,
  },
  pad: {
    backgroundColor: Colors.surface,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
    paddingHorizontal: Space.md,
    paddingTop: Space.md,
  },
  padRow: {
    flexDirection: 'row',
    gap: Space.sm,
    marginBottom: Space.md,
  },
  pointKey: {
    flex: 1,
    minHeight: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.ink,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.sm,
    paddingVertical: Space.sm,
  },
  pointKeyPressed: {
    backgroundColor: Colors.ink,
  },
  pointKeyLabel: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  pointKeyName: {
    ...Type.headline,
    color: Colors.text,
  },
  pointKeyTextPressed: {
    color: Colors.textInverse,
  },
  footer: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    backgroundColor: Colors.surface,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
});
