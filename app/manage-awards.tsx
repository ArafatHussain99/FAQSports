import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { X, Search, Check } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import {
  AwardCategory,
  AwardPlace,
  SportAward,
  StatSport,
  awardCategoriesFor,
  clearSportAward,
  setSportAward,
} from '@/api/statsApi';
import { SPORT_AWARDS_KEY, STAT_SPORT_LABELS, useSportAwards } from '@/hooks/useSportAwards';

const SPORTS: StatSport[] = ['cricket', 'football', 'table_tennis'];
const PLACES: AwardPlace[] = [1, 2];

const PLACE_LABEL: Record<AwardPlace, string> = { 1: 'Champion', 2: 'Runner-up' };
const ALREADY_LABEL: Record<AwardPlace, string> = { 1: 'Already champion', 2: 'Already runner-up' };
const CATEGORY_LABEL: Record<AwardCategory, string> = { main: '', singles: 'Singles', doubles: 'Doubles' };

type Feedback = { kind: 'ok' | 'error'; text: string };

const isTeamSport = (sport: StatSport) => sport !== 'table_tennis';

const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message) {
    return `${fallback} ${error.message}`;
  }
  return fallback;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ManageAwardsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, runWithGlobalLoading } = useApp();
  const { teams, players, getTeamById, getPlayerById } = useData();
  const { awards, isPending: isLoading, isError, refetch } = useSportAwards();

  const [sport, setSport] = useState<StatSport>('cricket');
  const [category, setCategory] = useState<AwardCategory>('main');
  const [picking, setPicking] = useState<AwardPlace | null>(null);
  // Doubles: the two players chosen so far in the open picker.
  const [pair, setPair] = useState<string[]>([]);
  const isDoubles = category === 'doubles';
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, Feedback | undefined>>({});

  const feedbackKey = (place: AwardPlace) => `${sport}:${category}:${place}`;
  const setPlaceFeedback = (place: AwardPlace, value: Feedback | undefined) =>
    setFeedback((prev) => ({ ...prev, [feedbackKey(place)]: value }));

  const awardFor = (place: AwardPlace): SportAward | undefined =>
    awards.find((a) => a.sport === sport && a.category === category && a.place === place);

  /** Team id, or the player ids (singles player / doubles pair) holding the award. */
  const holderIds = (award: SportAward | undefined): string[] => {
    if (!award) return [];
    if (isTeamSport(sport)) return award.teamId ? [award.teamId] : [];
    return award.recipientIds.length > 0 ? award.recipientIds : award.playerId ? [award.playerId] : [];
  };

  const holderName = (award: SportAward) => {
    if (isTeamSport(sport)) {
      return (award.teamId && getTeamById(award.teamId)?.name) || 'Unknown team';
    }
    const names = holderIds(award).map((id) => getPlayerById(id)?.name ?? 'Unknown player');
    return names.length > 0 ? names.join(' & ') : 'Unknown player';
  };

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.nickname ?? '').toLowerCase().includes(q)
    );
  }, [players, search]);

  const selectSport = (next: StatSport) => {
    setSport(next);
    setCategory(awardCategoriesFor(next)[0]);
    setPicking(null);
    setPair([]);
    setSearch('');
  };

  const selectCategory = (next: AwardCategory) => {
    setCategory(next);
    setPicking(null);
    setPair([]);
    setSearch('');
  };

  const openPicker = (place: AwardPlace) => {
    setPicking(picking === place ? null : place);
    setPair([]);
    setSearch('');
    setPlaceFeedback(place, undefined);
  };

  const togglePairPlayer = (id: string) =>
    setPair((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 2 ? [...prev, id] : prev));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: SPORT_AWARDS_KEY });
    await refetch();
  };

  const handlePick = async (place: AwardPlace, ids: string[], name: string) => {
    if (saving) return;
    setPlaceFeedback(place, undefined);
    setSaving(true);
    try {
      await runWithGlobalLoading(async () => {
        await setSportAward(
          sport,
          category,
          place,
          isTeamSport(sport) ? { teamId: ids[0] } : { playerIds: ids }
        );
        await refresh();
      }, `Setting ${PLACE_LABEL[place].toLowerCase()}...`);
      setPicking(null);
      setPair([]);
      setSearch('');
      setPlaceFeedback(place, { kind: 'ok', text: `${name} is now ${PLACE_LABEL[place].toLowerCase()}.` });
    } catch (error) {
      console.error('Error setting award:', error);
      setPlaceFeedback(place, { kind: 'error', text: errorMessage(error, "Couldn't save the award.") });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (place: AwardPlace) => {
    if (saving) return;
    setPlaceFeedback(place, undefined);
    setSaving(true);
    try {
      await runWithGlobalLoading(async () => {
        await clearSportAward(sport, category, place);
        await refresh();
      }, `Clearing ${PLACE_LABEL[place].toLowerCase()}...`);
      setPicking(null);
      setPlaceFeedback(place, { kind: 'ok', text: `${PLACE_LABEL[place]} cleared.` });
    } catch (error) {
      console.error('Error clearing award:', error);
      setPlaceFeedback(place, { kind: 'error', text: errorMessage(error, "Couldn't clear the award.") });
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        title: 'Champions',
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
      <View style={styles.container}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.noticeText}>Only admins can set champions.</Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderPicker = (place: AwardPlace) => {
    const otherPlace: AwardPlace = place === 1 ? 2 : 1;
    const otherIds = holderIds(awardFor(otherPlace));
    const currentIds = holderIds(awardFor(place));
    const teamSport = isTeamSport(sport);
    // Doubles: a pair can't be the same two players as the other place, but one
    // player may be in both pairs. Singles and teams: the other place's holder
    // is unavailable.
    const sameAsOther = (ids: string[]) =>
      ids.length > 0 && ids.length === otherIds.length && ids.every((id) => otherIds.includes(id));
    const pairNames = pair.map((id) => getPlayerById(id)?.name ?? 'Unknown player');
    const canSavePair = pair.length === 2 && !sameAsOther(pair) && !saving;

    const options = teamSport
      ? teams
          .filter((t) => t.sport === sport)
          .map((t) => ({ id: t.id, name: t.name, color: t.color }))
      : filteredPlayers.map((p) => ({ id: p.id, name: p.name, color: undefined as string | undefined }));

    return (
      <View style={styles.picker}>
        <Text style={styles.pickerTitle}>
          {teamSport ? 'Choose a team' : isDoubles ? `Choose two players (${pair.length}/2)` : 'Choose a player'}
        </Text>
        {!teamSport && (
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
        )}
        {options.length === 0 ? (
          <Text style={styles.pickerEmpty}>
            {teamSport ? `No active ${sport} teams yet.` : search.trim() ? 'No players match.' : 'No players yet.'}
          </Text>
        ) : (
          <View style={styles.optionList}>
            {options.map((opt, index) => {
              const inPair = isDoubles && pair.includes(opt.id);
              const takenByOther = !isDoubles && otherIds.includes(opt.id);
              const isCurrent = !isDoubles && currentIds.includes(opt.id);
              const pairFull = isDoubles && !inPair && pair.length >= 2;
              const disabled = takenByOther || isCurrent || pairFull || saving;
              const note = takenByOther ? ALREADY_LABEL[otherPlace] : isCurrent ? 'Current' : null;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.option,
                    index > 0 && styles.optionRuled,
                    inPair && styles.optionSelected,
                    disabled && styles.disabled,
                  ]}
                  onPress={() =>
                    isDoubles ? togglePairPlayer(opt.id) : handlePick(place, [opt.id], opt.name)
                  }
                  disabled={disabled}
                  activeOpacity={0.7}
                  accessibilityRole={isDoubles ? 'checkbox' : 'button'}
                  accessibilityState={isDoubles ? { checked: inPair, disabled } : { disabled }}
                  accessibilityLabel={note ? `${opt.name}, ${note}` : opt.name}
                >
                  {teamSport ? (
                    <View style={[styles.pin, { backgroundColor: opt.color ?? Colors.textMuted }]} />
                  ) : (
                    <View style={styles.avatarSmall}>
                      <Text style={styles.avatarSmallText}>{opt.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.optionText} numberOfLines={1}>{opt.name}</Text>
                  {note && <Text style={styles.optionNote}>{note}</Text>}
                  {inPair && <Check size={20} color={Colors.onHighlight} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {isDoubles && (
          <TouchableOpacity
            style={[styles.primaryButton, styles.savePairButton, !canSavePair && styles.disabled]}
            onPress={() => handlePick(place, pair, pairNames.join(' & '))}
            disabled={!canSavePair}
            accessibilityRole="button"
            accessibilityLabel={pair.length === 2 ? `Save pair ${pairNames.join(' and ')}` : 'Save pair'}
          >
            <Text style={styles.primaryButtonText}>
              {pair.length === 2 && sameAsOther(pair) ? ALREADY_LABEL[otherPlace] : 'Save pair'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setPicking(null);
            setPair([]);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.textButtonLabel}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBlock = (place: AwardPlace) => {
    const award = awardFor(place);
    const accent = place === 1 ? Colors.gold : Colors.silver;
    const soft = place === 1 ? Colors.goldSoft : Colors.silverSoft;
    const note = feedback[feedbackKey(place)];
    const team = award?.teamId ? getTeamById(award.teamId) : undefined;
    const count = award?.recipientIds.length ?? 0;

    return (
      <View key={place} style={[styles.block, { borderColor: accent }]}>
        <View style={[styles.blockHeader, { backgroundColor: soft }]}>
          <Text style={styles.blockTitle} accessibilityRole="header">
            {CATEGORY_LABEL[category]
              ? `${CATEGORY_LABEL[category]} ${PLACE_LABEL[place].toLowerCase()}`
              : PLACE_LABEL[place]}
          </Text>
        </View>

        <View style={styles.blockBody}>
          {award ? (
            <>
              <View style={styles.holderRow}>
                {isTeamSport(sport) ? (
                  <View style={[styles.pin, { backgroundColor: team?.color ?? Colors.textMuted }]} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{holderName(award).charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.holderName} numberOfLines={2}>{holderName(award)}</Text>
              </View>
              <Text style={styles.meta}>Awarded {formatDate(award.awardedAt)}</Text>
              <Text style={styles.meta}>
                {count} {count === 1 ? 'player' : 'players'} recognised
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, saving && styles.disabled]}
                  onPress={() => openPicker(place)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={`Change ${PLACE_LABEL[place].toLowerCase()}`}
                >
                  <Text style={styles.secondaryButtonText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.textButton, saving && styles.disabled]}
                  onPress={() => handleClear(place)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={`Clear ${PLACE_LABEL[place].toLowerCase()}`}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.notSet}>Not set</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.primaryButton, saving && styles.disabled]}
                  onPress={() => openPicker(place)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${PLACE_LABEL[place].toLowerCase()}`}
                >
                  <Text style={styles.primaryButtonText}>Choose</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {note && (
            <Text
              style={note.kind === 'ok' ? styles.okText : styles.errorText}
              accessibilityLiveRegion="polite"
            >
              {note.text}
            </Text>
          )}

          {picking === place && renderPicker(place)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {header}

      <View style={styles.segmentRow} accessibilityRole="tablist">
        {SPORTS.map((s) => {
          const selected = sport === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => selectSport(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]} numberOfLines={1}>
                {STAT_SPORT_LABELS[s]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {sport === 'table_tennis' && (
        <View style={styles.categoryRow} accessibilityRole="radiogroup" accessibilityLabel="Table tennis category">
          {awardCategoriesFor('table_tennis').map((c) => {
            const selected = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                onPress={() => selectCategory(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                  {CATEGORY_LABEL[c]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading champions...</Text>
        </View>
      ) : (
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isError && (
              <View style={styles.loadError}>
                <Text style={styles.errorText}>Couldn&apos;t load the current champions.</Text>
                <TouchableOpacity onPress={() => refetch()} style={styles.textButton} accessibilityRole="button">
                  <Text style={styles.textButtonLabel}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.blocks}>{PLACES.map(renderBlock)}</View>

            <Text style={styles.footnote}>
              {sport === 'table_tennis'
                ? 'Singles and doubles each have a champion and runner-up. A doubles award recognises both players.'
                : 'A team award recognises the players on the team now. They keep it if they move teams.'}
            </Text>
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    gap: Space.sm,
    marginHorizontal: Space.xl,
    marginTop: Space.md,
  },
  categoryChip: {
    flex: 1,
    minHeight: Touch,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.ink,
  },
  categoryChipText: {
    ...Type.bodyStrong,
    color: Colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: Colors.onHighlight,
  },
  optionSelected: {
    backgroundColor: Colors.highlight,
  },
  savePairButton: {
    alignSelf: 'stretch',
    marginTop: Space.md,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Space.xl,
    gap: Space.lg,
    backgroundColor: Colors.background,
  },
  noticeText: {
    ...Type.headline,
    color: Colors.text,
    textAlign: 'center',
  },
  loadingText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Space.xl,
    marginTop: Space.sm,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -Hairline,
  },
  segmentSelected: {
    borderBottomColor: Colors.ink,
  },
  segmentText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    fontWeight: '700',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.xxxl + Space.sm,
  },
  loadError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
    marginBottom: Space.md,
  },
  blocks: {
    gap: Space.md,
  },
  block: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  blockHeader: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  blockTitle: {
    ...Type.headline,
    color: Colors.text,
  },
  blockBody: {
    padding: Space.lg,
    gap: Space.xs,
  },
  holderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginBottom: Space.xs,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Type.headline,
    color: Colors.ink,
  },
  holderName: {
    ...Type.title,
    color: Colors.text,
    flex: 1,
  },
  meta: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  notSet: {
    ...Type.bodyStrong,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginTop: Space.md,
  },
  primaryButton: {
    height: Touch,
    paddingHorizontal: Space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  primaryButtonText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  secondaryButton: {
    height: Touch,
    paddingHorizontal: Space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.ink,
    borderRadius: Radius.md,
  },
  secondaryButtonText: {
    ...Type.headline,
    color: Colors.text,
  },
  textButton: {
    minHeight: 44,
    paddingHorizontal: Space.sm,
    justifyContent: 'center',
  },
  textButtonLabel: {
    ...Type.bodyStrong,
    color: Colors.primary,
  },
  clearText: {
    ...Type.bodyStrong,
    color: Colors.error,
  },
  okText: {
    ...Type.footnote,
    color: Colors.success,
    marginTop: Space.sm,
  },
  errorText: {
    ...Type.footnote,
    color: Colors.error,
    marginTop: Space.sm,
    flexShrink: 1,
  },
  picker: {
    marginTop: Space.md,
    paddingTop: Space.md,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
    gap: Space.sm,
  },
  pickerTitle: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.text,
  },
  pickerEmpty: {
    ...Type.subhead,
    color: Colors.textSecondary,
    paddingVertical: Space.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    height: Touch,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
  },
  searchInput: {
    // Type.body without lineHeight: a fixed lineHeight misaligns TextInput text on iOS.
    flex: 1,
    fontSize: Type.body.fontSize,
    fontWeight: Type.body.fontWeight,
    height: Touch,
    color: Colors.text,
  },
  optionList: {
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
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs,
    backgroundColor: Colors.card,
  },
  optionRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  optionText: {
    ...Type.body,
    color: Colors.text,
    flex: 1,
  },
  optionNote: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    ...Type.caption,
    color: Colors.ink,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  footnote: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginTop: Space.lg,
  },
});
