import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { Stack, useRouter } from 'expo-router';
import { Check, Minus, Plus, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createTournament } from '../api';
import { TOURNAMENT_SPORT_LABELS, useTournaments } from '../hooks';
import { roundRobinFixtures } from '../standings';
import { Qualifiers, TournamentFormat, TournamentSport } from '../types';

const SPORTS: TournamentSport[] = ['cricket', 'football', 'table_tennis'];
const MAX_TEAMS = 16;

type TTEntryDraft = { name: string; playerIds: string[] };

const errorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error && error.code === '42501') {
    return 'Only admins can create tournaments. Sign out and in again if you are an admin.';
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return `Couldn't create the tournament. ${error.message}`;
  }
  return "Couldn't create the tournament.";
};

const QUALIFIER_OPTIONS: { value: Qualifiers; label: string; hint: string; minTeams: number }[] = [
  { value: 0, label: 'League only', hint: 'Top of the table wins', minTeams: 2 },
  { value: 2, label: 'Final', hint: 'Top 2 play a final', minTeams: 3 },
  { value: 4, label: 'Semi-finals', hint: 'Top 4: 1st v 4th, 2nd v 3rd', minTeams: 4 },
];

export default function CreateTournamentScreen() {
  const router = useRouter();
  const { isAdmin, currentSport, runWithGlobalLoading } = useApp();
  const { players, getTeamsForSport } = useData();
  const { invalidate } = useTournaments();

  const [sport, setSport] = useState<TournamentSport>(
    SPORTS.includes(currentSport as TournamentSport) ? (currentSport as TournamentSport) : 'cricket'
  );
  const [format, setFormat] = useState<TournamentFormat>('single');
  const [name, setName] = useState('');
  const [overs, setOvers] = useState('10');
  const [playersPerSide, setPlayersPerSide] = useState('11');
  const [teamCount, setTeamCount] = useState(4);
  const [qualifiers, setQualifiers] = useState<Qualifiers>(0);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [ttEntries, setTtEntries] = useState<TTEntryDraft[]>([]);
  const [activeEntry, setActiveEntry] = useState<number | null>(0);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTT = sport === 'table_tennis';
  const entrySize = format === 'double' ? 2 : 1;
  const sportTeams = useMemo(
    () => (isTT ? [] : getTeamsForSport(sport).sort((a, b) => a.name.localeCompare(b.name))),
    [isTT, sport, getTeamsForSport]
  );
  const maxTeams = Math.min(
    MAX_TEAMS,
    isTT ? Math.floor(players.length / entrySize) : sportTeams.length
  );

  // Keep the table tennis slots in step with the number of teams.
  useEffect(() => {
    if (!isTT) return;
    setTtEntries(prev =>
      Array.from({ length: teamCount }, (_, i) => prev[i] ?? { name: `Team ${i + 1}`, playerIds: [] })
    );
  }, [isTT, teamCount]);

  // Not more teams than the sport has (teams) or players can fill (table tennis).
  useEffect(() => {
    if (maxTeams >= 2 && teamCount > maxTeams) {
      setTeamCount(maxTeams);
      setTeamIds(prev => prev.slice(0, maxTeams));
    }
  }, [maxTeams, teamCount]);

  // Qualifiers can't exceed what the number of teams allows.
  useEffect(() => {
    const allowed = QUALIFIER_OPTIONS.filter(o => teamCount >= o.minTeams).map(o => o.value);
    if (!allowed.includes(qualifiers)) setQualifiers(0);
  }, [teamCount, qualifiers]);

  const selectSport = (next: TournamentSport) => {
    setSport(next);
    setTeamIds([]);
    setTtEntries([]);
    setActiveEntry(0);
    setError(null);
  };

  const selectFormat = (next: TournamentFormat) => {
    setFormat(next);
    // Pairs don't survive a switch to singles and vice versa.
    setTtEntries(prev => prev.map(e => ({ ...e, playerIds: [] })));
    setActiveEntry(0);
  };

  const changeCount = (delta: number) => {
    const next = Math.max(2, Math.min(Math.max(2, maxTeams), teamCount + delta));
    setTeamCount(next);
    setTeamIds(prev => prev.slice(0, next));
    if (activeEntry !== null && activeEntry >= next) setActiveEntry(null);
  };

  const toggleTeam = (id: string) => {
    setTeamIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : prev.length < teamCount ? [...prev, id] : prev
    );
  };

  const usedPlayerIds = useMemo(() => new Set(ttEntries.flatMap(e => e.playerIds)), [ttEntries]);

  const togglePlayer = (playerId: string) => {
    if (activeEntry === null) return;
    setTtEntries(prev =>
      prev.map((entry, i) => {
        if (i !== activeEntry) return entry;
        if (entry.playerIds.includes(playerId)) {
          return { ...entry, playerIds: entry.playerIds.filter(p => p !== playerId) };
        }
        if (entry.playerIds.length >= entrySize) return entry;
        return { ...entry, playerIds: [...entry.playerIds, playerId] };
      })
    );
    // Move on to the next unfilled slot once this one is full.
    const current = ttEntries[activeEntry];
    if (current && !current.playerIds.includes(playerId) && current.playerIds.length + 1 === entrySize) {
      const next = ttEntries.findIndex((e, i) => i > activeEntry && e.playerIds.length < entrySize);
      setActiveEntry(next === -1 ? null : next);
      setSearch('');
    }
  };

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(p => p.name.toLowerCase().includes(q) || (p.nickname ?? '').toLowerCase().includes(q));
  }, [players, search]);

  const oversNum = Number(overs);
  const ppsNum = Number(playersPerSide);

  const problem = (() => {
    if (!name.trim()) return 'Give the tournament a name.';
    if (maxTeams < 2) {
      return isTT
        ? `Add at least ${entrySize * 2} players first.`
        : `Add at least 2 ${TOURNAMENT_SPORT_LABELS[sport].toLowerCase()} teams first.`;
    }
    if (sport === 'cricket') {
      if (!Number.isInteger(oversNum) || oversNum < 1 || oversNum > 50) return 'Overs per innings must be 1–50.';
      if (!Number.isInteger(ppsNum) || ppsNum < 2 || ppsNum > 11) return 'Players per side must be 2–11.';
    }
    if (isTT) {
      const missing = ttEntries.filter(e => e.playerIds.length !== entrySize).length;
      if (missing > 0) return `Choose ${entrySize === 2 ? 'two players' : 'a player'} for ${missing} more team${missing === 1 ? '' : 's'}.`;
      if (ttEntries.some(e => !e.name.trim())) return 'Every team needs a name.';
    } else if (teamIds.length !== teamCount) {
      return `Choose ${teamCount - teamIds.length} more team${teamCount - teamIds.length === 1 ? '' : 's'}.`;
    }
    return null;
  })();

  const handleCreate = async () => {
    if (saving || problem) return;
    setError(null);
    setSaving(true);
    try {
      const id = await runWithGlobalLoading(
        () =>
          createTournament({
            name: name.trim(),
            sport,
            format: isTT ? format : null,
            oversPerInnings: sport === 'cricket' ? oversNum : null,
            playersPerSide: sport === 'cricket' ? ppsNum : null,
            qualifiers,
            entries: isTT
              ? ttEntries.map(e => ({ teamId: null, name: e.name.trim(), playerIds: e.playerIds }))
              : teamIds.map(teamId => ({
                  teamId,
                  name: sportTeams.find(t => t.id === teamId)?.name ?? '',
                  playerIds: [],
                })),
          }),
        'Creating tournament...'
      );
      await invalidate();
      router.replace(`/tournaments/${id}`);
    } catch (e) {
      console.error('Error creating tournament:', e);
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        title: 'New Tournament',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={22} color={Colors.text} />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.notice}>Only admins can create tournaments.</Text>
      </View>
    );
  }

  const matchCount = roundRobinFixtures(teamCount).length + (qualifiers === 4 ? 3 : qualifiers === 2 ? 1 : 0);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Sport</Text>
        <View style={styles.row}>
          {SPORTS.map(s => (
            <Chip key={s} label={TOURNAMENT_SPORT_LABELS[s]} selected={sport === s} onPress={() => selectSport(s)} />
          ))}
        </View>

        {isTT && (
          <>
            <Text style={styles.label}>Type</Text>
            <View style={styles.row}>
              <Chip label="Singles" selected={format === 'single'} onPress={() => selectFormat('single')} />
              <Chip label="Doubles" selected={format === 'double'} onPress={() => selectFormat('double')} />
            </View>
          </>
        )}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Summer Cup 2026"
          placeholderTextColor={Colors.textMuted}
          maxLength={60}
          accessibilityLabel="Tournament name"
        />

        {sport === 'cricket' && (
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.label}>Overs per innings</Text>
              <TextInput
                style={styles.input}
                value={overs}
                onChangeText={t => setOvers(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Overs per innings"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Players per side</Text>
              <TextInput
                style={styles.input}
                value={playersPerSide}
                onChangeText={t => setPlayersPerSide(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
                accessibilityLabel="Players per side"
              />
            </View>
          </View>
        )}

        <Text style={styles.label}>Number of teams</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, teamCount <= 2 && styles.disabled]}
            onPress={() => changeCount(-1)}
            disabled={teamCount <= 2}
            accessibilityRole="button"
            accessibilityLabel="Fewer teams"
          >
            <Minus size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.stepValue} accessibilityLiveRegion="polite">{teamCount}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, teamCount >= maxTeams && styles.disabled]}
            onPress={() => changeCount(1)}
            disabled={teamCount >= maxTeams}
            accessibilityRole="button"
            accessibilityLabel="More teams"
          >
            <Plus size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.hint}>{matchCount} matches</Text>
        </View>

        <Text style={styles.label}>After the league</Text>
        <View style={styles.optionGroup}>
          {QUALIFIER_OPTIONS.map((o, i) => {
            const disabled = teamCount < o.minTeams;
            const selected = qualifiers === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[styles.option, i > 0 && styles.optionRuled, disabled && styles.disabled]}
                onPress={() => setQualifiers(o.value)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{o.label}</Text>
                  <Text style={styles.optionHint}>{disabled ? `Needs ${o.minTeams}+ teams` : o.hint}</Text>
                </View>
                {selected && <Check size={20} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {isTT ? (
          <>
            <Text style={styles.label}>Teams</Text>
            <Text style={styles.hint}>
              Tap a team, then choose {entrySize === 2 ? 'its two players' : 'its player'}. You can rename teams now or later.
            </Text>
            <View style={styles.optionGroup}>
              {ttEntries.map((entry, i) => {
                const active = activeEntry === i;
                const names = entry.playerIds.map(id => players.find(p => p.id === id)?.name ?? 'Unknown');
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.entryRow, i > 0 && styles.optionRuled, active && styles.entryActive]}
                    onPress={() => {
                      setActiveEntry(active ? null : i);
                      setSearch('');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${entry.name}, ${names.length ? names.join(' and ') : 'no players yet'}`}
                  >
                    <TextInput
                      style={styles.entryName}
                      value={entry.name}
                      onChangeText={text =>
                        setTtEntries(prev => prev.map((e, j) => (j === i ? { ...e, name: text } : e)))
                      }
                      maxLength={30}
                      accessibilityLabel={`Name of team ${i + 1}`}
                    />
                    <Text
                      style={[styles.entryPlayers, names.length < entrySize && styles.entryMissing]}
                      numberOfLines={1}
                    >
                      {names.length ? names.join(' & ') : `Choose ${entrySize === 2 ? '2 players' : 'a player'}`}
                      {names.length > 0 && names.length < entrySize ? ' + 1 more' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {activeEntry !== null && ttEntries[activeEntry] && (
              <View style={styles.picker}>
                <Text style={styles.pickerTitle}>
                  Players for {ttEntries[activeEntry].name || `Team ${activeEntry + 1}`} (
                  {ttEntries[activeEntry].playerIds.length}/{entrySize})
                </Text>
                <View style={styles.searchBox}>
                  <Search size={20} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search players"
                    placeholderTextColor={Colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoCorrect={false}
                    accessibilityLabel="Search players"
                  />
                </View>
                <View style={styles.optionGroup}>
                  {filteredPlayers.length === 0 ? (
                    <Text style={[styles.hint, styles.pickerEmpty]}>No players match.</Text>
                  ) : (
                    filteredPlayers.map((p, i) => {
                      const mine = ttEntries[activeEntry].playerIds.includes(p.id);
                      const elsewhere = !mine && usedPlayerIds.has(p.id);
                      const full = !mine && ttEntries[activeEntry].playerIds.length >= entrySize;
                      const disabled = elsewhere || full;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.option, i > 0 && styles.optionRuled, mine && styles.optionSelected, disabled && styles.disabled]}
                          onPress={() => togglePlayer(p.id)}
                          disabled={disabled}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: mine, disabled }}
                        >
                          <Text style={[styles.optionLabel, styles.optionText]} numberOfLines={1}>{p.name}</Text>
                          {elsewhere && <Text style={styles.optionHint}>In another team</Text>}
                          {mine && <Check size={20} color={Colors.onHighlight} />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>
              Teams ({teamIds.length}/{teamCount})
            </Text>
            {sportTeams.length === 0 ? (
              <Text style={styles.hint}>
                No {TOURNAMENT_SPORT_LABELS[sport].toLowerCase()} teams yet. Add teams in the Teams tab.
              </Text>
            ) : (
              <View style={styles.optionGroup}>
                {sportTeams.map((team, i) => {
                  const selected = teamIds.includes(team.id);
                  const disabled = !selected && teamIds.length >= teamCount;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.option, i > 0 && styles.optionRuled, selected && styles.optionSelected, disabled && styles.disabled]}
                      onPress={() => toggleTeam(team.id)}
                      disabled={disabled}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled }}
                    >
                      <View style={[styles.pin, { backgroundColor: team.color }]} />
                      <Text style={[styles.optionLabel, styles.optionText]} numberOfLines={1}>{team.name}</Text>
                      {selected && <Check size={20} color={Colors.onHighlight} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {problem && !error && <Text style={styles.hint}>{problem}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, (!!problem || saving) && styles.disabled]}
          onPress={handleCreate}
          disabled={!!problem || saving}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>{saving ? 'Creating...' : 'Create tournament'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.xxxl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space.xl,
    backgroundColor: Colors.background,
  },
  notice: {
    ...Type.headline,
    color: Colors.text,
    textAlign: 'center',
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...Type.footnote,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: Space.xl,
    marginBottom: Space.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  chip: {
    minHeight: Touch,
    justifyContent: 'center',
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
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
    ...Type.body,
    minHeight: Touch,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    color: Colors.text,
  },
  twoCol: {
    flexDirection: 'row',
    gap: Space.md,
  },
  col: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  stepBtn: {
    width: Touch,
    height: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  stepValue: {
    ...Type.scoreM,
    minWidth: 32,
    textAlign: 'center',
    color: Colors.text,
  },
  hint: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  optionGroup: {
    marginTop: Space.sm,
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: Touch,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  optionRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.highlight,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...Type.body,
    color: Colors.text,
  },
  optionHint: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  pin: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  entryRow: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  entryActive: {
    backgroundColor: Colors.highlightSoft,
  },
  entryName: {
    ...Type.bodyStrong,
    color: Colors.text,
    paddingVertical: Space.xs,
  },
  entryPlayers: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  entryMissing: {
    color: Colors.warning,
  },
  picker: {
    marginTop: Space.md,
  },
  pickerTitle: {
    ...Type.headline,
    color: Colors.text,
    marginBottom: Space.sm,
  },
  pickerEmpty: {
    padding: Space.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    minHeight: Touch,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceLight,
  },
  searchInput: {
    ...Type.body,
    flex: 1,
    color: Colors.text,
  },
  error: {
    ...Type.subhead,
    color: Colors.error,
    marginTop: Space.lg,
  },
  primaryBtn: {
    minHeight: Touch,
    marginTop: Space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
});
