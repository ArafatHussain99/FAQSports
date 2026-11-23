import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp } from '@/context/AppContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Check, ChevronRight, Pencil, Trophy, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  clearMatchResult,
  createKnockoutMatches,
  deleteTournament,
  finishTournament,
  renameEntry,
  saveMatchResult,
  setTieBreakRanks,
} from '../api';
import ResultModal from '../components/ResultModal';
import TieBreakModal from '../components/TieBreakModal';
import { tournamentKindLabel, useEntryNames, useTournaments } from '../hooks';
import {
  ballsToOvers,
  computeStandings,
  firstPlaceTie,
  isLeagueComplete,
  nextKnockoutStage,
  qualificationTie,
  stageLabel,
  tournamentPlacings,
  winnerEntryId,
} from '../standings';
import { MatchResultInput, Tournament, TournamentMatch } from '../types';

type Tab = 'matches' | 'table' | 'teams' | 'stats';
const TABS: { id: Tab; label: string }[] = [
  { id: 'matches', label: 'Matches' },
  { id: 'table', label: 'Table' },
  { id: 'teams', label: 'Teams' },
  { id: 'stats', label: 'Stats' },
];

type Notice = { kind: 'ok' | 'error'; text: string };

const errorText = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === '42501') return `${fallback} Only admins can change tournaments.`;
    if (error.code === '23503') return `${fallback} It is still linked to other records.`;
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return `${fallback} ${error.message}`;
  }
  return fallback;
};

const formatDate = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const TIE_RULES: Record<Tournament['sport'], string> = {
  cricket: 'Win 2 pts, tie or no result 1. Level teams split by net run rate, then head-to-head.',
  football: 'Win 3 pts, draw 1. Level teams split by goal difference, then head-to-head, then goals scored.',
  table_tennis: 'Win 3 pts. Level teams split by head-to-head, then game difference.',
};

const NET_LABEL: Record<Tournament['sport'], string> = { cricket: 'NRR', football: 'GD', table_tennis: '+/-' };

const formatNet = (sport: Tournament['sport'], net: number) => {
  if (sport === 'cricket') return `${net >= 0 ? '+' : ''}${net.toFixed(3)}`;
  return `${net > 0 ? '+' : ''}${net}`;
};

/** Score of one side: "120/5 (18.3)" for cricket, the number otherwise. */
const sideScore = (t: Tournament, m: TournamentMatch, side: 'A' | 'B') => {
  if (m.status !== 'completed' || m.outcome === 'no_result') return '';
  const score = side === 'A' ? m.scoreA : m.scoreB;
  if (t.sport !== 'cricket') return String(score ?? 0);
  const wickets = side === 'A' ? m.wicketsA : m.wicketsB;
  const balls = side === 'A' ? m.ballsA : m.ballsB;
  return `${score ?? 0}/${wickets ?? 0}${balls !== null ? ` (${ballsToOvers(balls)})` : ''}`;
};

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, runWithGlobalLoading } = useApp();
  const { tournaments, isPending, isError, refetch, isRefetching, invalidate } = useTournaments();
  const { entryName, entryPlayers } = useEntryNames();

  const [tab, setTab] = useState<Tab>('matches');
  const [editing, setEditing] = useState<TournamentMatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [tieOpen, setTieOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const tiePrompted = useRef<string | null>(null);

  const tournament = tournaments.find(t => t.id === id);
  const standings = useMemo(() => (tournament ? computeStandings(tournament) : null), [tournament]);

  const nameOf = (entryId: string | null | undefined) =>
    entryName(tournament?.entries.find(e => e.id === entryId));

  const isLive = tournament?.status === 'live';
  const leagueDone = tournament ? isLeagueComplete(tournament) : false;

  /** Teams an admin must choose between: at the knockout cut-off, or for champion (league only). */
  const tie = useMemo(() => {
    if (!tournament || !standings || !isLive || !leagueDone) return null;
    if (tournament.qualifiers > 0) {
      if (tournament.matches.some(m => m.stage !== 'league')) return null;
      return qualificationTie(tournament, standings);
    }
    const group = firstPlaceTie(standings);
    return group ? { entryIds: group, slots: 1 } : null;
  }, [tournament, standings, isLive, leagueDone]);

  const next = tournament && standings ? nextKnockoutStage(tournament, standings) : null;
  const placings = tournament && standings && isLive ? tournamentPlacings(tournament, standings) : null;

  // Ask once per tie as soon as it appears (the banner stays for later).
  useEffect(() => {
    if (!isAdmin || !tie) return;
    const key = tie.entryIds.join(',');
    if (tiePrompted.current !== key) {
      tiePrompted.current = key;
      setModalError(null);
      setTieOpen(true);
    }
  }, [isAdmin, tie]);

  const run = async (task: () => Promise<unknown>, message: string, success: string, failure: string) => {
    if (saving) return false;
    setSaving(true);
    setNotice(null);
    try {
      await runWithGlobalLoading(async () => {
        await task();
        await invalidate();
      }, message);
      setNotice({ kind: 'ok', text: success });
      return true;
    } catch (error) {
      console.error(failure, error);
      setNotice({ kind: 'error', text: errorText(error, failure) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Same as `run` but keeps the error inside the open modal. */
  const runInModal = async (task: () => Promise<unknown>, message: string, failure: string) => {
    if (saving) return false;
    setSaving(true);
    setModalError(null);
    try {
      await runWithGlobalLoading(async () => {
        await task();
        await invalidate();
      }, message);
      return true;
    } catch (error) {
      console.error(failure, error);
      setModalError(errorText(error, failure));
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (isPending) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Tournament' }} />
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isError || !tournament || !standings) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Tournament' }} />
        <Text style={styles.message}>
          {isError ? "Couldn't load the tournament." : 'This tournament no longer exists.'}
        </Text>
        {isError && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const t = tournament;
  const hasKnockouts = t.matches.some(m => m.stage !== 'league');
  const hasFinal = t.matches.some(m => m.stage === 'final');

  /** Results that later stages depend on can't change any more. */
  const lockReason = (m: TournamentMatch): string | null => {
    if (!isLive) return 'Tournament finished';
    if (m.stage === 'league' && hasKnockouts) return 'Knockouts started';
    if (m.stage === 'semi' && hasFinal) return 'Final created';
    return null;
  };

  const upcoming = t.matches.filter(m => m.status === 'upcoming');
  const completed = t.matches.filter(m => m.status === 'completed').reverse();
  const champion = t.entries.find(e => e.id === t.winnerEntryId);
  const final = t.matches.find(m => m.stage === 'final');
  const runnerUpId = final && winnerEntryId(final)
    ? (winnerEntryId(final) === final.entryAId ? final.entryBId : final.entryAId)
    : t.qualifiers === 0
      ? standings.rows.find(r => r.entryId !== t.winnerEntryId)?.entryId
      : undefined;

  const onSaveResult = async (result: MatchResultInput) => {
    if (!editing) return;
    const ok = await runInModal(() => saveMatchResult(editing.id, result), 'Saving result...', "Couldn't save the result.");
    if (ok) {
      setEditing(null);
      setNotice({ kind: 'ok', text: 'Result saved.' });
    }
  };

  const onClearResult = async () => {
    if (!editing) return;
    const ok = await runInModal(() => clearMatchResult(editing.id), 'Clearing result...', "Couldn't clear the result.");
    if (ok) {
      setEditing(null);
      setNotice({ kind: 'ok', text: 'Result cleared.' });
    }
  };

  const onResolveTie = async (chosen: string[]) => {
    if (!tie) return;
    const others = tie.entryIds.filter(eid => !chosen.includes(eid));
    const ranks = [
      ...chosen.map((entryId, i) => ({ entryId, rank: i + 1 })),
      ...others.map(entryId => ({ entryId, rank: chosen.length + 1 })),
    ];
    const ok = await runInModal(() => setTieBreakRanks(ranks), 'Saving...', "Couldn't save the choice.");
    if (ok) {
      setTieOpen(false);
      setNotice({
        kind: 'ok',
        text: t.qualifiers > 0 ? `${chosen.map(nameOf).join(', ')} go through.` : `${nameOf(chosen[0])} finishes first.`,
      });
    }
  };

  const onCreateKnockouts = () => {
    if (!next) return;
    const label = next.stage === 'semi' ? 'Semi-finals' : 'Final';
    run(
      () => createKnockoutMatches(t.id, next.stage, next.pairs),
      `Creating ${label.toLowerCase()}...`,
      `${label} created.`,
      `Couldn't create the ${label.toLowerCase()}.`
    );
  };

  const onFinish = () => {
    if (!placings) return;
    run(
      () => finishTournament(t.id, placings.winner),
      'Finishing tournament...',
      `${nameOf(placings.winner)} are the champions. The tournament is now archived.`,
      "Couldn't finish the tournament."
    );
  };

  const onDelete = async () => {
    const ok = await run(() => deleteTournament(t.id), 'Deleting tournament...', 'Tournament deleted.', "Couldn't delete the tournament.");
    if (ok) router.back();
  };

  const onRename = async () => {
    if (!renaming || !renaming.name.trim()) return;
    const ok = await run(() => renameEntry(renaming.id, renaming.name), 'Renaming...', 'Team renamed.', "Couldn't rename the team.");
    if (ok) setRenaming(null);
  };

  const renderMatch = (m: TournamentMatch, index: number) => {
    const winner = winnerEntryId(m);
    const locked = lockReason(m);
    const canEdit = isAdmin && !locked;
    const level = m.status === 'completed' && m.scoreA === m.scoreB && m.outcome !== 'no_result';
    const result =
      m.status !== 'completed'
        ? isAdmin && canEdit ? 'Tap to enter result' : 'Upcoming'
        : m.outcome === 'no_result'
          ? 'No result'
          : m.outcome === 'draw'
            ? t.sport === 'cricket' ? 'Match tied' : 'Draw'
            : `${nameOf(winner)} won${level ? (t.sport === 'cricket' ? ' (super over)' : ' (penalties)') : ''}`;

    return (
      <TouchableOpacity
        key={m.id}
        style={[styles.matchRow, index > 0 && styles.ruled]}
        onPress={() => {
          setModalError(null);
          setEditing(m);
        }}
        disabled={!canEdit}
        activeOpacity={0.7}
        accessibilityRole={canEdit ? 'button' : 'text'}
        accessibilityLabel={`${stageLabel(m)}: ${nameOf(m.entryAId)} ${sideScore(t, m, 'A')} versus ${nameOf(m.entryBId)} ${sideScore(t, m, 'B')}. ${result}`}
      >
        <View style={styles.matchBody}>
          <Text style={styles.matchStage}>{stageLabel(m).toUpperCase()}</Text>
          {(['A', 'B'] as const).map(side => {
            const entryId = side === 'A' ? m.entryAId : m.entryBId;
            const won = winner === entryId;
            return (
              <View key={side} style={styles.matchSide}>
                <Text style={[styles.matchTeam, won && styles.bold]} numberOfLines={1}>{nameOf(entryId)}</Text>
                <Text style={[styles.matchScore, won && styles.bold]}>{sideScore(t, m, side)}</Text>
              </View>
            );
          })}
          <Text style={[styles.matchResult, m.status !== 'completed' && canEdit && styles.link]}>{result}</Text>
        </View>
        {canEdit && <ChevronRight size={20} color={Colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  const renderMatches = () => (
    <>
      <Text style={styles.sectionTitle}>Upcoming</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.message}>{isLive ? 'No matches waiting to be played.' : 'All matches played.'}</Text>
      ) : (
        <View style={styles.group}>{upcoming.map(renderMatch)}</View>
      )}
      <Text style={styles.sectionTitle}>Completed</Text>
      {completed.length === 0 ? (
        <Text style={styles.message}>No results yet.</Text>
      ) : (
        <View style={styles.group}>{completed.map(renderMatch)}</View>
      )}
      {isAdmin && isLive && hasKnockouts && (
        <Text style={styles.footnote}>League results are locked once knockouts start.</Text>
      )}
    </>
  );

  const unresolved = new Set(standings.unresolvedTies.flat());
  const showDraws = t.sport !== 'table_tennis';
  const showNoResult = t.sport === 'cricket';

  const renderTable = () => (
    <>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHead]}>
          <Text style={[styles.cellPos, styles.headText]}>#</Text>
          <Text style={[styles.cellTeam, styles.headText]}>Team</Text>
          <Text style={[styles.cell, styles.headText]}>P</Text>
          <Text style={[styles.cell, styles.headText]}>W</Text>
          {showDraws && <Text style={[styles.cell, styles.headText]}>{t.sport === 'cricket' ? 'T' : 'D'}</Text>}
          <Text style={[styles.cell, styles.headText]}>L</Text>
          {showNoResult && <Text style={[styles.cell, styles.headText]}>NR</Text>}
          <Text style={[styles.cellNet, styles.headText]}>{NET_LABEL[t.sport]}</Text>
          <Text style={[styles.cellPts, styles.headText]}>Pts</Text>
        </View>
        {standings.rows.map(row => {
          const qualifies = t.qualifiers > 0 && row.position <= t.qualifiers;
          return (
            <View
              key={row.entryId}
              style={[styles.tableRow, styles.ruled, qualifies && styles.qualifies]}
              accessibilityLabel={`${row.position}. ${nameOf(row.entryId)}, ${row.points} points, ${NET_LABEL[t.sport]} ${formatNet(t.sport, row.net)}`}
            >
              <Text style={styles.cellPos}>
                {row.position}
                {unresolved.has(row.entryId) ? '=' : ''}
              </Text>
              <Text style={[styles.cellTeam, styles.teamText]} numberOfLines={1}>{nameOf(row.entryId)}</Text>
              <Text style={styles.cell}>{row.played}</Text>
              <Text style={styles.cell}>{row.won}</Text>
              {showDraws && <Text style={styles.cell}>{row.drawn}</Text>}
              <Text style={styles.cell}>{row.lost}</Text>
              {showNoResult && <Text style={styles.cell}>{row.noResult}</Text>}
              <Text style={styles.cellNet}>{formatNet(t.sport, row.net)}</Text>
              <Text style={[styles.cellPts, styles.bold]}>{row.points}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.footnote}>{TIE_RULES[t.sport]}</Text>
      {t.qualifiers > 0 && (
        <Text style={styles.footnote}>
          Marked rows: top {t.qualifiers} go to the {t.qualifiers === 4 ? 'semi-finals' : 'final'}.
        </Text>
      )}
      {standings.unresolvedTies.length > 0 && (
        <Text style={styles.footnote}>= level on every tie-breaker.</Text>
      )}
    </>
  );

  const renderTeams = () => (
    <View style={styles.group}>
      {t.entries.map((entry, i) => {
        const isRenaming = renaming?.id === entry.id;
        const canRename = isAdmin && !entry.teamId;
        return (
          <View key={entry.id} style={[styles.entryRow, i > 0 && styles.ruled]}>
            {isRenaming ? (
              <View style={styles.renameRow}>
                <TextInput
                  style={styles.renameInput}
                  value={renaming.name}
                  onChangeText={name => setRenaming({ id: entry.id, name })}
                  maxLength={30}
                  autoFocus
                  accessibilityLabel="Team name"
                  onSubmitEditing={onRename}
                />
                <TouchableOpacity
                  style={[styles.iconBtn, (!renaming.name.trim() || saving) && styles.disabled]}
                  onPress={onRename}
                  disabled={!renaming.name.trim() || saving}
                  accessibilityRole="button"
                  accessibilityLabel="Save name"
                >
                  <Check size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setRenaming(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel rename"
                >
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.renameRow}>
                <TouchableOpacity
                  style={styles.entryText}
                  onPress={() => entry.teamId && router.push(`/team/${entry.teamId}`)}
                  disabled={!entry.teamId}
                  accessibilityRole={entry.teamId ? 'link' : 'text'}
                >
                  <Text style={styles.entryName} numberOfLines={1}>{entryName(entry)}</Text>
                  {!!entryPlayers(entry) && <Text style={styles.entryPlayers}>{entryPlayers(entry)}</Text>}
                </TouchableOpacity>
                {canRename && (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setRenaming({ id: entry.id, name: entry.name })}
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${entry.name}`}
                  >
                    <Pencil size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                {!!entry.teamId && <ChevronRight size={20} color={Colors.textMuted} />}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderStats = () => {
    const done = t.matches.filter(m => m.status === 'completed' && m.outcome !== 'no_result');
    const unit = t.sport === 'cricket' ? 'runs' : t.sport === 'football' ? 'goals' : 'games';
    const totals = new Map<string, { scored: number; conceded: number; wins: number; played: number }>();
    t.entries.forEach(e => totals.set(e.id, { scored: 0, conceded: 0, wins: 0, played: 0 }));
    let best: { entryId: string; score: number; match: TournamentMatch } | null = null;
    let biggest: { match: TournamentMatch; margin: number } | null = null;
    done.forEach(m => {
      const a = m.scoreA ?? 0;
      const b = m.scoreB ?? 0;
      const ta = totals.get(m.entryAId);
      const tb = totals.get(m.entryBId);
      if (ta) Object.assign(ta, { scored: ta.scored + a, conceded: ta.conceded + b, played: ta.played + 1, wins: ta.wins + (winnerEntryId(m) === m.entryAId ? 1 : 0) });
      if (tb) Object.assign(tb, { scored: tb.scored + b, conceded: tb.conceded + a, played: tb.played + 1, wins: tb.wins + (winnerEntryId(m) === m.entryBId ? 1 : 0) });
      if (!best || a > best.score) best = { entryId: m.entryAId, score: a, match: m };
      if (!best || b > best.score) best = { entryId: m.entryBId, score: b, match: m };
      if (!biggest || Math.abs(a - b) > biggest.margin) biggest = { match: m, margin: Math.abs(a - b) };
    });
    const rows = [...totals.entries()].filter(([, v]) => v.played > 0);
    const top = (key: (v: { scored: number; conceded: number; wins: number; played: number }) => number) =>
      rows.length ? rows.reduce((x, y) => (key(y[1]) > key(x[1]) ? y : x)) : null;
    const mostScored = top(v => v.scored);
    const bestDefence = top(v => -v.conceded / v.played);
    const mostWins = top(v => v.wins);
    const scoredTotal = done.reduce((sum, m) => sum + (m.scoreA ?? 0) + (m.scoreB ?? 0), 0);
    const bestScore = best as { entryId: string; score: number; match: TournamentMatch } | null;
    const biggestWin = biggest as { match: TournamentMatch; margin: number } | null;

    const stats: { label: string; value: string; detail?: string }[] = [
      { label: 'Matches played', value: `${t.matches.filter(m => m.status === 'completed').length} of ${t.matches.length}` },
      { label: `Total ${unit}`, value: String(scoredTotal), detail: done.length ? `${(scoredTotal / done.length).toFixed(1)} a match` : undefined },
    ];
    if (mostWins) stats.push({ label: 'Most wins', value: nameOf(mostWins[0]), detail: `${mostWins[1].wins} wins` });
    if (mostScored) stats.push({ label: `Most ${unit} scored`, value: nameOf(mostScored[0]), detail: `${mostScored[1].scored} ${unit}` });
    if (bestDefence) {
      stats.push({
        label: t.sport === 'cricket' ? 'Fewest runs conceded (per match)' : t.sport === 'football' ? 'Best defence' : `Fewest ${unit} lost (per match)`,
        value: nameOf(bestDefence[0]),
        detail: `${(bestDefence[1].conceded / bestDefence[1].played).toFixed(1)} ${unit} a match`,
      });
    }
    if (bestScore) {
      const m = bestScore.match;
      const opponent = bestScore.entryId === m.entryAId ? m.entryBId : m.entryAId;
      stats.push({
        label: t.sport === 'cricket' ? 'Highest total' : `Most ${unit} in a match`,
        value: nameOf(bestScore.entryId),
        detail: `${t.sport === 'cricket' ? sideScore(t, m, bestScore.entryId === m.entryAId ? 'A' : 'B') : bestScore.score} v ${nameOf(opponent)}`,
      });
    }
    if (biggestWin && biggestWin.margin > 0 && t.sport !== 'cricket') {
      const m = biggestWin.match;
      stats.push({
        label: 'Biggest win',
        value: nameOf(winnerEntryId(m)),
        detail: `${Math.max(m.scoreA ?? 0, m.scoreB ?? 0)}–${Math.min(m.scoreA ?? 0, m.scoreB ?? 0)} v ${nameOf(winnerEntryId(m) === m.entryAId ? m.entryBId : m.entryAId)}`,
      });
    }

    return (
      <View style={styles.group}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.statRow, i > 0 && styles.ruled]}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <View style={styles.statValueBox}>
              <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
              {s.detail ? <Text style={styles.statDetail}>{s.detail}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const editingNames = editing
    ? { a: nameOf(editing.entryAId), b: nameOf(editing.entryBId) }
    : { a: '', b: '' };

  return (
    <>
      <Stack.Screen options={{ title: t.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        <Text style={styles.kind}>{tournamentKindLabel(t).toUpperCase()}</Text>
        <Text style={styles.title} accessibilityRole="header">{t.name}</Text>
        <Text style={styles.meta}>
          {t.entries.length} teams ·{' '}
          {t.qualifiers === 0 ? 'League' : t.qualifiers === 2 ? 'League + final' : 'League + semi-finals'}
          {t.sport === 'cricket' && t.oversPerInnings ? ` · ${t.oversPerInnings} overs` : ''}
        </Text>
        <Text style={styles.meta}>
          {isLive ? `Started ${formatDate(t.startDate ?? t.createdAt)}` : `${formatDate(t.startDate)} – ${formatDate(t.endDate)}`}
        </Text>

        {!isLive && (
          <View style={styles.champion}>
            <Trophy size={24} color={Colors.gold} />
            <View style={styles.championText}>
              <Text style={styles.championLabel}>CHAMPION</Text>
              <Text style={styles.championName}>{champion ? entryName(champion) : 'Not recorded'}</Text>
              {!!runnerUpId && <Text style={styles.championRunnerUp}>Runner-up: {nameOf(runnerUpId)}</Text>}
            </View>
          </View>
        )}

        {isAdmin && isLive && (tie || next || placings) && (
          <View style={styles.actions}>
            {tie && (
              <View style={styles.tieBanner}>
                <AlertTriangle size={20} color={Colors.warning} />
                <Text style={styles.tieText}>
                  {tie.entryIds.map(nameOf).join(', ')} are level on every tie-breaker.{' '}
                  {t.qualifiers > 0 ? `Choose ${tie.slots} to go through.` : 'Choose the champion.'}
                </Text>
              </View>
            )}
            {tie && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setModalError(null);
                  setTieOpen(true);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>{t.qualifiers > 0 ? 'Choose who goes through' : 'Choose champion'}</Text>
              </TouchableOpacity>
            )}
            {next && (
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.disabled]}
                onPress={onCreateKnockouts}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>
                  Create {next.stage === 'semi' ? 'semi-finals' : 'final'}:{' '}
                  {next.pairs.map(([a, b]) => `${nameOf(a)} v ${nameOf(b)}`).join(', ')}
                </Text>
              </TouchableOpacity>
            )}
            {placings && (
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.disabled]}
                onPress={onFinish}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Finish tournament: {nameOf(placings.winner)} win</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {notice && (
          <Text style={[styles.notice, notice.kind === 'error' && styles.noticeError]} accessibilityLiveRegion="polite">
            {notice.text}
          </Text>
        )}

        <View style={styles.tabs} accessibilityRole="tablist">
          {TABS.map(item => {
            const selected = tab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.tab, selected && styles.tabSelected]}
                onPress={() => setTab(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'matches' && renderMatches()}
        {tab === 'table' && renderTable()}
        {tab === 'teams' && renderTeams()}
        {tab === 'stats' && renderStats()}

        {isAdmin && (
          <View style={styles.dangerZone}>
            {confirmDelete ? (
              <>
                <Text style={styles.message}>Delete {t.name} with all its matches and results? This can&apos;t be undone.</Text>
                <View style={styles.confirmRow}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, styles.flex]}
                    onPress={() => setConfirmDelete(false)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dangerBtn, styles.flex, saving && styles.disabled]}
                    onPress={onDelete}
                    disabled={saving}
                    accessibilityRole="button"
                  >
                    <Text style={styles.dangerBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity style={styles.textBtn} onPress={() => setConfirmDelete(true)} accessibilityRole="button">
                <Text style={styles.textBtnDanger}>Delete tournament</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {editing && (
        <ResultModal
          tournament={t}
          match={editing}
          nameA={editingNames.a}
          nameB={editingNames.b}
          saving={saving}
          error={modalError}
          onSave={onSaveResult}
          onClear={onClearResult}
          onClose={() => setEditing(null)}
        />
      )}

      <TieBreakModal
        visible={tieOpen && !!tie}
        options={(tie?.entryIds ?? []).map(entryId => {
          const row = standings.rows.find(r => r.entryId === entryId);
          return {
            id: entryId,
            name: nameOf(entryId),
            detail: row ? `${row.points} pts · ${NET_LABEL[t.sport]} ${formatNet(t.sport, row.net)}` : undefined,
          };
        })}
        slots={tie?.slots ?? 1}
        title={t.qualifiers > 0 ? 'Who goes through?' : 'Who is champion?'}
        message={
          t.qualifiers > 0
            ? `These teams are level on points, head-to-head and the other tie-breakers. Pick the ${tie?.slots ?? 1} that go through, in finishing order.`
            : 'These teams are level on every tie-breaker. Pick the team that finishes first.'
        }
        saving={saving}
        error={modalError}
        onConfirm={onResolveTie}
        onClose={() => setTieOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.xl,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  kind: {
    ...Type.tag,
    color: Colors.textSecondary,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
    marginTop: Space.xxs,
  },
  meta: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  champion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginTop: Space.lg,
    padding: Space.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
    backgroundColor: Colors.goldSoft,
  },
  championText: {
    flex: 1,
  },
  championLabel: {
    ...Type.tag,
    color: Colors.ink,
  },
  championName: {
    ...Type.title,
    color: Colors.ink,
  },
  championRunnerUp: {
    ...Type.subhead,
    color: Colors.ink,
  },
  actions: {
    gap: Space.sm,
    marginTop: Space.lg,
  },
  tieBanner: {
    flexDirection: 'row',
    gap: Space.sm,
    padding: Space.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.card,
  },
  tieText: {
    ...Type.subhead,
    flex: 1,
    color: Colors.text,
  },
  primaryBtn: {
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  secondaryBtn: {
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  secondaryBtnText: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  notice: {
    ...Type.subhead,
    color: Colors.success,
    marginTop: Space.md,
  },
  noticeError: {
    color: Colors.error,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: Space.xl,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -Hairline,
  },
  tabSelected: {
    borderBottomColor: Colors.ink,
  },
  tabText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  tabTextSelected: {
    fontWeight: '700',
    color: Colors.text,
  },
  sectionTitle: {
    ...Type.headline,
    color: Colors.text,
    marginTop: Space.xl,
    marginBottom: Space.sm,
  },
  message: {
    ...Type.footnote,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footnote: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginTop: Space.sm,
  },
  group: {
    marginTop: Space.md,
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  ruled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  matchBody: {
    flex: 1,
  },
  matchStage: {
    ...Type.tag,
    color: Colors.textMuted,
    marginBottom: Space.xxs,
  },
  matchSide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Space.md,
  },
  matchTeam: {
    ...Type.body,
    flex: 1,
    color: Colors.text,
  },
  matchScore: {
    ...Type.number,
    fontWeight: '500',
    color: Colors.text,
  },
  bold: {
    fontWeight: '800',
  },
  matchResult: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  link: {
    color: Colors.primary,
  },
  table: {
    marginTop: Space.md,
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: Space.sm,
  },
  tableHead: {
    backgroundColor: Colors.surfaceLight,
  },
  headText: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  qualifies: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.completed,
  },
  cellPos: {
    ...Type.number,
    width: 28,
    color: Colors.textSecondary,
  },
  cellTeam: {
    flex: 1,
    paddingRight: Space.xs,
  },
  teamText: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  cell: {
    ...Type.footnote,
    width: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    color: Colors.text,
  },
  cellNet: {
    ...Type.footnote,
    width: 56,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    color: Colors.text,
  },
  cellPts: {
    ...Type.number,
    width: 36,
    textAlign: 'right',
    color: Colors.text,
  },
  entryRow: {
    paddingLeft: Space.lg,
    paddingRight: Space.sm,
    minHeight: Touch,
    justifyContent: 'center',
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  entryText: {
    flex: 1,
    paddingVertical: Space.sm,
  },
  entryName: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  entryPlayers: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  renameInput: {
    ...Type.body,
    flex: 1,
    minHeight: 40,
    marginVertical: Space.xs,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    color: Colors.text,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  statLabel: {
    ...Type.subhead,
    flex: 1,
    color: Colors.textSecondary,
  },
  statValueBox: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  statValue: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  statDetail: {
    ...Type.footnote,
    fontVariant: ['tabular-nums'],
    color: Colors.textSecondary,
  },
  dangerZone: {
    marginTop: Space.xxxl,
    gap: Space.md,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  dangerBtn: {
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.error,
  },
  dangerBtnText: {
    ...Type.bodyStrong,
    color: Colors.textInverse,
  },
  textBtn: {
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBtnDanger: {
    ...Type.bodyStrong,
    color: Colors.error,
  },
  disabled: {
    opacity: 0.4,
  },
});
