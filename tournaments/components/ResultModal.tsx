import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ballsToOvers, outcomeFromScores, oversToBalls, stageLabel } from '../standings';
import { MatchOutcome, MatchResultInput, Tournament, TournamentMatch } from '../types';

type Props = {
  tournament: Tournament;
  match: TournamentMatch | null;
  nameA: string;
  nameB: string;
  saving: boolean;
  error: string | null;
  onSave: (result: MatchResultInput) => void;
  onClear: () => void;
  onClose: () => void;
};

const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
const digits = (t: string) => t.replace(/[^0-9]/g, '');

/** Admin form to enter or change a tournament match result. Works on web (no Alert buttons). */
export default function ResultModal({ tournament, match, nameA, nameB, saving, error, onSave, onClear, onClose }: Props) {
  const sport = tournament.sport;
  const isKnockout = match?.stage !== 'league';
  const scoreLabel = sport === 'cricket' ? 'Runs' : sport === 'football' ? 'Goals' : 'Games won';
  const maxWickets = Math.max(1, (tournament.playersPerSide ?? 11) - 1);
  const quotaBalls = (tournament.oversPerInnings ?? 20) * 6;

  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [wicketsA, setWicketsA] = useState('');
  const [wicketsB, setWicketsB] = useState('');
  const [oversA, setOversA] = useState('');
  const [oversB, setOversB] = useState('');
  const [noResult, setNoResult] = useState(false);
  // Knockout decided on a tie (super over / penalties).
  const [tieWinner, setTieWinner] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    if (!match) return;
    setScoreA(str(match.scoreA));
    setScoreB(str(match.scoreB));
    setWicketsA(str(match.wicketsA));
    setWicketsB(str(match.wicketsB));
    setOversA(match.ballsA !== null ? ballsToOvers(match.ballsA) : '');
    setOversB(match.ballsB !== null ? ballsToOvers(match.ballsB) : '');
    setNoResult(match.outcome === 'no_result');
    const levelScores = match.scoreA !== null && match.scoreA === match.scoreB;
    setTieWinner(levelScores && (match.outcome === 'A' || match.outcome === 'B') ? match.outcome : null);
  }, [match]);

  if (!match) return null;

  const a = Number(scoreA);
  const b = Number(scoreB);
  const level = scoreA !== '' && scoreB !== '' && a === b;
  const canNoResult = sport === 'cricket' && !isKnockout;

  const problem = (() => {
    if (noResult) return null;
    if (scoreA === '' || scoreB === '') return `Enter ${scoreLabel.toLowerCase()} for both sides.`;
    if (sport === 'table_tennis' && level) return 'A table tennis match needs a winner.';
    if (sport === 'cricket') {
      for (const [w, o, name] of [[wicketsA, oversA, nameA], [wicketsB, oversB, nameB]] as const) {
        if (w === '' || o === '') return `Enter wickets and overs for ${name}.`;
        if (Number(w) > maxWickets) return `Wickets can't be more than ${maxWickets}.`;
        const balls = oversToBalls(o);
        if (balls === null) return 'Overs look like 18.3 (balls 0–5).';
        if (balls > quotaBalls) return `Overs can't be more than ${tournament.oversPerInnings}.`;
      }
    }
    if (isKnockout && level && !tieWinner) {
      return sport === 'cricket' ? 'Scores are level: who won the super over?' : 'Scores are level: who won on penalties?';
    }
    return null;
  })();

  const save = () => {
    if (problem || saving) return;
    if (noResult) {
      onSave({ scoreA: 0, scoreB: 0, outcome: 'no_result' });
      return;
    }
    let outcome: MatchOutcome = outcomeFromScores(a, b);
    if (outcome === 'draw' && isKnockout && tieWinner) outcome = tieWinner;
    onSave({
      scoreA: a,
      scoreB: b,
      outcome,
      ...(sport === 'cricket'
        ? {
            wicketsA: Number(wicketsA),
            wicketsB: Number(wicketsB),
            ballsA: oversToBalls(oversA),
            ballsB: oversToBalls(oversB),
          }
        : {}),
    });
  };

  const side = (
    label: string,
    score: string,
    setScore: (v: string) => void,
    wickets: string,
    setWickets: (v: string) => void,
    overs: string,
    setOvers: (v: string) => void
  ) => (
    <View style={styles.side}>
      <Text style={styles.sideName} numberOfLines={1}>{label}</Text>
      <View style={styles.fields}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{scoreLabel}</Text>
          <TextInput
            style={styles.input}
            value={score}
            onChangeText={t => setScore(digits(t))}
            keyboardType="number-pad"
            maxLength={3}
            editable={!noResult}
            accessibilityLabel={`${label} ${scoreLabel}`}
          />
        </View>
        {sport === 'cricket' && (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Wickets</Text>
              <TextInput
                style={styles.input}
                value={wickets}
                onChangeText={t => setWickets(digits(t))}
                keyboardType="number-pad"
                maxLength={2}
                editable={!noResult}
                accessibilityLabel={`${label} wickets`}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Overs</Text>
              <TextInput
                style={styles.input}
                value={overs}
                onChangeText={t => setOvers(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                maxLength={4}
                placeholder="18.3"
                placeholderTextColor={Colors.textMuted}
                editable={!noResult}
                accessibilityLabel={`${label} overs`}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>{stageLabel(match)} result</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {sport === 'cricket' && (
              <Text style={styles.hint}>
                {tournament.oversPerInnings} overs a side. A side with {maxWickets} wickets down is all out and
                counts as batting its full overs for net run rate.
              </Text>
            )}
            {side(nameA, scoreA, setScoreA, wicketsA, setWicketsA, oversA, setOversA)}
            {side(nameB, scoreB, setScoreB, wicketsB, setWicketsB, oversB, setOversB)}

            {canNoResult && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>No result (abandoned)</Text>
                <Switch value={noResult} onValueChange={setNoResult} accessibilityLabel="No result" />
              </View>
            )}

            {isKnockout && level && !noResult && sport !== 'table_tennis' && (
              <>
                <Text style={styles.fieldLabel}>
                  {sport === 'cricket' ? 'Super over winner' : 'Penalty shoot-out winner'}
                </Text>
                <View style={styles.winnerRow}>
                  {(['A', 'B'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.winnerChip, tieWinner === s && styles.winnerChipSelected]}
                      onPress={() => setTieWinner(s)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: tieWinner === s }}
                    >
                      <Text style={styles.winnerText} numberOfLines={1}>{s === 'A' ? nameA : nameB}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : problem ? <Text style={styles.hint}>{problem}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, (!!problem || saving) && styles.disabled]}
              onPress={save}
              disabled={!!problem || saving}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>{saving ? 'Saving...' : 'Save result'}</Text>
            </TouchableOpacity>
            {match.status === 'completed' && (
              <TouchableOpacity
                style={[styles.textBtn, saving && styles.disabled]}
                onPress={onClear}
                disabled={saving}
                accessibilityRole="button"
              >
                <Text style={styles.textBtnLabel}>Clear result</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: Space.xl,
    backgroundColor: Colors.scrim,
  },
  sheet: {
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: Space.lg,
    borderRadius: Radius.lg,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.sm,
  },
  title: {
    ...Type.headline,
    color: Colors.text,
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -Space.sm,
  },
  hint: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginBottom: Space.sm,
  },
  side: {
    marginTop: Space.md,
  },
  sideName: {
    ...Type.bodyStrong,
    color: Colors.text,
    marginBottom: Space.xs,
  },
  fields: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    ...Type.caption,
    color: Colors.textSecondary,
    marginTop: Space.sm,
    marginBottom: Space.xs,
  },
  input: {
    ...Type.number,
    minHeight: Touch,
    paddingHorizontal: Space.md,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    color: Colors.text,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: Touch,
    marginTop: Space.md,
  },
  switchLabel: {
    ...Type.body,
    color: Colors.text,
  },
  winnerRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  winnerChip: {
    flex: 1,
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.sm,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  winnerChipSelected: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.ink,
  },
  winnerText: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  error: {
    ...Type.subhead,
    color: Colors.error,
    marginTop: Space.md,
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
  textBtn: {
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Space.xs,
  },
  textBtnLabel: {
    ...Type.bodyStrong,
    color: Colors.error,
  },
  disabled: {
    opacity: 0.4,
  },
});
