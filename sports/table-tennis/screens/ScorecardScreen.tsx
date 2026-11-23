import { isPermissionError, PERMISSION_ERROR_MESSAGE } from '@/api/supabaseClient';
import Colors from '@/constants/colors';
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
        <ActivityIndicator size="large" color={Colors.tableTennis} />
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

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title: 'Table Tennis' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Match info */}
        <View style={styles.infoRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(snapshot.status) }]}>
            <Text style={styles.statusText}>{snapshot.status.toUpperCase()}</Text>
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Match setup</Text>
            {isAdmin ? (
              <>
                <SetupEditor
                  config={config}
                  setup={state.setup}
                  players={players}
                  onChange={handleSetupChange}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
                  <Text style={styles.primaryButtonText}>Start Match</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.mutedText}>This match hasn&apos;t started yet.</Text>
            )}
          </View>
        )}

        {snapshot.status !== 'upcoming' && (
          <>
            {/* Scoreboard */}
            <View style={styles.scoreboard}>
              {(['A', 'B'] as TTSide[]).map(side => {
                const serving = !state.matchOver && state.servingSide === side && snapshot.status === 'live';
                const score = side === 'A' ? state.scoreA : state.scoreB;
                const gamesWon = side === 'A' ? state.gamesWonA : state.gamesWonB;
                return (
                  <TouchableOpacity
                    key={side}
                    style={[styles.scorePanel, serving && styles.scorePanelServing]}
                    activeOpacity={canScore && !state.matchOver ? 0.6 : 1}
                    disabled={!canScore || state.matchOver}
                    onPress={() => handlePoint(side)}
                    accessibilityRole="button"
                    accessibilityLabel={`Point to ${sideName(side)}`}
                  >
                    <Text style={styles.panelName} numberOfLines={2}>{sideName(side)}</Text>
                    <Text style={styles.panelScore}>{score}</Text>
                    <Text style={styles.panelGames}>Games {gamesWon}</Text>
                    {serving && <Text style={styles.servingTag}>🏓 Serving</Text>}
                    {canScore && !state.matchOver && <Text style={styles.tapHint}>Tap for point</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Service info */}
            {!state.matchOver && snapshot.status === 'live' && (
              <View style={styles.card}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.cardTitle}>Game {state.currentGame + 1}</Text>
                  {state.isDeuce && (
                    <View style={styles.deuceBadge}>
                      <Text style={styles.deuceText}>
                        {state.advantage ? 'ADVANTAGE' : 'DEUCE'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.serviceLine}>
                  Server: <Text style={styles.bold}>{playerName(players, state.serverId)}</Text>
                </Text>
                <Text style={styles.serviceLine}>
                  Receiver: <Text style={styles.bold}>{playerName(players, state.receiverId)}</Text>
                </Text>
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
              <View style={styles.card}>
                {lastGame && (
                  <Text style={styles.gameEndedText}>
                    Game {state.currentGame} to {sideName(lastGame.winner ?? 'A')} ({lastGame.a}-{lastGame.b})
                  </Text>
                )}
                <Text style={styles.cardTitle}>Game {state.currentGame + 1} setup</Text>
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
              <View style={[styles.card, styles.resultCard]}>
                <Trophy size={28} color={Colors.upcoming} />
                <Text style={styles.resultTitle}>Winner: {sideName(state.matchWinner)}</Text>
                <Text style={styles.resultSubtitle}>
                  {Math.max(state.gamesWonA, state.gamesWonB)}-{Math.min(state.gamesWonA, state.gamesWonB)} in games
                </Text>
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

            {canScore && (
              <TouchableOpacity
                style={[styles.undoButton, snapshot.points.length === 0 && styles.disabled]}
                onPress={handleUndo}
                disabled={snapshot.points.length === 0}
              >
                <RotateCcw size={18} color={Colors.text} />
                <Text style={styles.undoText}>Undo last point</Text>
              </TouchableOpacity>
            )}

            {/* Game-by-game scorecard */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Scorecard</Text>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableName, styles.tableHeader]}>Player</Text>
                {state.games.length === 0 && <Text style={[styles.tableCell, styles.tableHeader]}>G1</Text>}
                {state.games.map((_, i) => (
                  <Text key={i} style={[styles.tableCell, styles.tableHeader]}>G{i + 1}</Text>
                ))}
                <Text style={[styles.tableCell, styles.tableHeader]}>Games</Text>
              </View>
              {(['A', 'B'] as TTSide[]).map(side => (
                <View key={side} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableName]} numberOfLines={1}>
                    {teamLabel(players, side === 'A' ? config.teamA : config.teamB)}
                  </Text>
                  {state.games.length === 0 && <Text style={styles.tableCell}>0</Text>}
                  {state.games.map((game, i) => (
                    <Text
                      key={i}
                      style={[styles.tableCell, game.winner === side && styles.tableWin]}
                    >
                      {side === 'A' ? game.a : game.b}
                    </Text>
                  ))}
                  <Text style={[styles.tableCell, styles.bold]}>
                    {side === 'A' ? state.gamesWonA : state.gamesWonB}
                  </Text>
                </View>
              ))}
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
                    <Text style={styles.primaryButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.deleteLink} onPress={() => setConfirmDelete(true)}>
                <Trash2 size={16} color={Colors.error} />
                <Text style={styles.deleteText}>Delete match</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
      <TouchableOpacity style={styles.saveRow} onPress={onRetry}>
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
        <Text style={styles.mutedText}>
          The player on the right serves {config.servesPerTurn} times, then swaps sides with their
          partner and service passes to the other team&apos;s player on the right.
        </Text>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
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
        <Text style={styles.courtName} numberOfLines={1}>{playerName(players, id, true)}</Text>
        <Text style={styles.courtLabel}>{isServer ? 'Serving' : isReceiver ? 'Receiving' : label}</Text>
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
      {subtitle && <Text style={styles.mutedText}>{subtitle}</Text>}
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
  content: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: Colors.background,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.background,
  },
  saveRow: {
    alignItems: 'flex-end',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 6,
  },
  mutedText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  bold: {
    fontWeight: '700',
    color: Colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: '100%',
  },
  chipActive: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.background,
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.tableTennis,
    alignSelf: 'stretch',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
  },
  secondaryButtonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  dangerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
  },
  scoreboard: {
    flexDirection: 'row',
    gap: 12,
  },
  scorePanel: {
    flex: 1,
    minHeight: 180,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scorePanelServing: {
    borderColor: Colors.tableTennis,
  },
  panelName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  panelScore: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 4,
  },
  panelGames: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  servingTag: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.tableTennis,
  },
  tapHint: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.textMuted,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deuceBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deuceText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.background,
  },
  serviceLine: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  court: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  courtRow: {
    flexDirection: 'row',
  },
  courtCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  courtServer: {
    backgroundColor: Colors.tableTennis,
  },
  courtReceiver: {
    backgroundColor: Colors.surfaceLight,
  },
  courtName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  courtLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  net: {
    height: 4,
    backgroundColor: Colors.text,
  },
  gameEndedText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  resultCard: {
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tableCell: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tableName: {
    flex: 1,
    width: undefined,
    textAlign: 'left',
    color: Colors.text,
  },
  tableHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tableWin: {
    color: Colors.primary,
    fontWeight: '700',
  },
  deleteArea: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  confirmRow: {
    alignItems: 'center',
    gap: 8,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
