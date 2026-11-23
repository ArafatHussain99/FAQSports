import { updatePlayerProfile } from '@/api/playerApi';
import Colors from '@/constants/colors';
import { getPlayerCover, PLAYER_COVERS } from '@/constants/playerCovers';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { Comment, PerformanceSummary } from '@/types';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ban, Pencil, Send, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NICKNAME_MAX_LENGTH = 30;

type StatItem = { label: string; value: string | number };

// Same grid as the Profile tab: 2 columns, hairline rules between cells.
function StatGrid({ items, size = 'large' }: { items: StatItem[]; size?: 'large' | 'medium' }) {
  return (
    <View style={styles.statsGrid}>
      {items.map((stat, index) => (
        <View
          key={stat.label}
          style={[
            styles.statCell,
            index % 2 === 1 && styles.statCellRight,
            index >= 2 && styles.statCellBottom,
          ]}
        >
          <Text style={size === 'large' ? styles.statValue : styles.statValueMedium}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

// PerformanceSummary has no result yet; read one if the data starts carrying it.
function getResult(performance: PerformanceSummary): 'win' | 'loss' | null {
  const result = (performance as PerformanceSummary & { result?: unknown }).result;
  return result === 'win' || result === 'loss' ? result : null;
}

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPlayerById, getTeamById, refetchPlayers } = useData();
  const { userName, isAdmin, runWithGlobalLoading } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  // Edit profile (admin only)
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editCoverKey, setEditCoverKey] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const player = getPlayerById(id || '');
  const team = player?.teamId ? getTeamById(player.teamId) : null;
  const cover = getPlayerCover(player?.coverImageKey);

  if (!player) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Player Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Player not found</Text>
        </View>
      </View>
    );
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment_${Date.now()}`,
      userId: 'current_user',
      userName: userName,
      playerId: player.id,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const openEditProfile = () => {
    setEditNickname(player.nickname ?? '');
    setEditCoverKey(player.coverImageKey ?? null);
    setProfileError(null);
    setIsEditing(true);
  };

  const closeEditProfile = () => {
    if (isSavingProfile) return;
    setIsEditing(false);
    setProfileError(null);
  };

  const trimmedNickname = editNickname.trim();
  const profileChanged =
    (trimmedNickname || null) !== (player.nickname ?? null) ||
    editCoverKey !== (player.coverImageKey ?? null);

  const handleSaveProfile = async () => {
    if (!profileChanged) return;

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await runWithGlobalLoading(async () => {
        await updatePlayerProfile(player.id, {
          nickname: trimmedNickname || null,
          coverImageKey: editCoverKey,
        });
        await refetchPlayers();
      }, 'Saving profile...');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving player profile:', error);
      // Shown inside the modal so it's visible on web too (Alert.alert is a no-op there).
      setProfileError(error instanceof Error ? error.message : 'Failed to save. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const overviewStats: StatItem[] = [
    { label: 'Matches', value: player.stats.matches },
    { label: 'Runs', value: player.stats.runs },
    { label: 'Wickets', value: player.stats.wickets },
    { label: 'Rating', value: player.ratings.overall },
  ];

  const ratings = [
    { label: 'Batting', value: player.ratings.batting },
    { label: 'Bowling', value: player.ratings.bowling },
    { label: 'Fielding', value: player.ratings.fielding },
  ];

  const battingStats: StatItem[] = [
    { label: 'Runs', value: player.stats.runs },
    { label: 'Balls', value: player.stats.balls },
    { label: 'Average', value: player.stats.average.toFixed(1) },
    { label: 'Strike rate', value: player.stats.strikeRate.toFixed(1) },
    { label: 'Highest', value: player.stats.highestScore },
    { label: '50s', value: player.stats.fifties },
    { label: '100s', value: player.stats.centuries },
  ];

  const bowlingStats: StatItem[] = [
    { label: 'Wickets', value: player.stats.wickets },
    { label: 'Economy', value: player.stats.economyRate.toFixed(1) },
    { label: 'Best', value: player.stats.bestBowling },
  ];

  const fieldingStats: StatItem[] = [
    { label: 'Catches', value: player.stats.catches },
    { label: 'Run outs', value: player.stats.runOuts },
    { label: 'Stumpings', value: player.stats.stumpings },
  ];

  const otherStats: StatItem[] = [
    { label: 'Goals', value: player.stats.goals ?? 0 },
    { label: 'Assists', value: player.stats.assists ?? 0 },
    { label: 'Wins', value: player.stats.wins ?? 0 },
  ];

  const lastFive = player.lastFivePerformances.slice(0, 5);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title: player.name }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {cover && (
          <Image
            source={cover.source}
            style={styles.coverImage}
            resizeMode="cover"
            accessibilityLabel={`${player.name}'s cover picture`}
          />
        )}

        <View style={styles.body}>
          <View style={styles.identity}>
            <Text style={styles.playerName}>{player.name}</Text>
            {player.nickname && (
              <Text style={styles.playerNickname}>&ldquo;{player.nickname}&rdquo;</Text>
            )}
            {team && (
              <View style={styles.teamRow}>
                <View style={[styles.teamPin, { backgroundColor: team.color }]} />
                <Text style={styles.teamName}>{team.name}</Text>
              </View>
            )}
            <View style={styles.roleRow}>
              <Text style={styles.playerPosition}>{player.position || 'Player'}</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={openEditProfile}
                  accessibilityRole="button"
                  accessibilityLabel="Edit nickname and cover picture"
                >
                  <Pencil size={16} color={Colors.text} />
                  <Text style={styles.editProfileBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <StatGrid items={overviewStats} />

          <Text style={styles.sectionTitle}>Skill ratings</Text>
          <View style={styles.card}>
            {ratings.map((rating) => (
              <View key={rating.label} style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>{rating.label}</Text>
                <View style={styles.ratingTrack}>
                  <View style={[styles.ratingBar, { width: `${rating.value}%` }]} />
                </View>
                <Text style={styles.ratingValue}>{rating.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Last five</Text>
          {lastFive.length === 0 ? (
            <Text style={styles.emptyLine}>No recent matches yet.</Text>
          ) : (
            <View style={styles.formRow}>
              {lastFive.map((performance) => {
                const result = getResult(performance);
                const tone =
                  result === 'win' ? Colors.completed : result === 'loss' ? Colors.live : Colors.textSecondary;
                const label = result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : 'PLAYED';
                return (
                  <View
                    key={performance.matchId}
                    style={[styles.formTag, { borderColor: tone }]}
                    accessibilityLabel={`${label.toLowerCase()} against ${performance.opponent}`}
                  >
                    <Text style={[styles.formTagText, { color: tone }]}>{label}</Text>
                    <Text style={styles.formOpponent} numberOfLines={1}>vs {performance.opponent}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.sectionTitle}>Batting</Text>
          <StatGrid items={battingStats} size="medium" />

          <Text style={styles.sectionTitle}>Bowling</Text>
          <StatGrid items={bowlingStats} size="medium" />

          <Text style={styles.sectionTitle}>Fielding</Text>
          <StatGrid items={fieldingStats} size="medium" />

          <Text style={styles.sectionTitle}>Other</Text>
          <StatGrid items={otherStats} size="medium" />

          <Text style={styles.sectionTitle}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.emptyLine}>No comments yet. Be the first to comment.</Text>
          ) : (
            <View>
              {comments.map((comment, index) => (
                <View key={comment.id} style={[styles.commentItem, index > 0 && styles.commentItemRuled]}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{comment.userName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentUser}>{comment.userName}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Write a comment..."
          placeholderTextColor={Colors.textMuted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newComment.trim() && styles.disabled]}
          onPress={handleAddComment}
          disabled={!newComment.trim()}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
        >
          <Send size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Edit Profile sheet (admin only) */}
      <Modal
        visible={isAdmin && isEditing}
        transparent
        animationType="slide"
        onRequestClose={closeEditProfile}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>Edit profile</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={closeEditProfile}
                disabled={isSavingProfile}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle} numberOfLines={1}>{player.name}</Text>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
              <Text style={styles.label}>Nickname</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., The Wall"
                placeholderTextColor={Colors.textMuted}
                value={editNickname}
                onChangeText={setEditNickname}
                maxLength={NICKNAME_MAX_LENGTH}
                editable={!isSavingProfile}
                autoCapitalize="words"
              />
              <Text style={styles.helperText}>
                {editNickname.length}/{NICKNAME_MAX_LENGTH} · leave empty for no nickname
              </Text>

              <Text style={[styles.label, styles.labelSpaced]}>Cover picture</Text>
              <View style={styles.coverGrid}>
                <TouchableOpacity
                  style={[styles.coverOption, !editCoverKey && styles.coverOptionActive]}
                  onPress={() => setEditCoverKey(null)}
                  disabled={isSavingProfile}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !editCoverKey }}
                  accessibilityLabel="No cover picture"
                >
                  <View style={styles.coverOptionNone}>
                    <Ban size={20} color={Colors.textSecondary} />
                    <Text style={styles.coverOptionNoneText}>None</Text>
                  </View>
                </TouchableOpacity>
                {PLAYER_COVERS.map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.coverOption, editCoverKey === option.key && styles.coverOptionActive]}
                    onPress={() => setEditCoverKey(option.key)}
                    disabled={isSavingProfile}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: editCoverKey === option.key }}
                    accessibilityLabel={option.label}
                  >
                    <Image source={option.source} style={styles.coverOptionImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helperText}>
                Pictures are bundled with the app (assets/images/player-covers).
              </Text>
            </ScrollView>

            {profileError && (
              <Text style={styles.profileError} accessibilityRole="alert">{profileError}</Text>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEditProfile}
                disabled={isSavingProfile}
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  (isSavingProfile || !profileChanged) && styles.disabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile || !profileChanged}
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>{isSavingProfile ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
    ...Type.body,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Space.xxxl,
  },
  coverImage: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.surfaceLight,
  },
  body: {
    paddingHorizontal: Space.xl,
  },
  identity: {
    alignItems: 'flex-start',
    gap: Space.xs,
    paddingTop: Space.xl,
    paddingBottom: Space.xs,
  },
  playerName: {
    ...Type.title,
    color: Colors.text,
  },
  playerNickname: {
    ...Type.subhead,
    fontStyle: 'italic',
    color: Colors.textSecondary,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    marginTop: Space.xs,
  },
  teamPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  roleRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.md,
    marginTop: Space.xs,
  },
  playerPosition: {
    ...Type.subhead,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    minHeight: 44,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  editProfileBtnText: {
    ...Type.headline,
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginTop: Space.md,
    overflow: 'hidden',
  },
  statCell: {
    width: '50%',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  statCellRight: {
    borderLeftWidth: Hairline,
    borderLeftColor: Colors.border,
  },
  statCellBottom: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  statValue: {
    ...Type.scoreL,
    color: Colors.text,
  },
  statValueMedium: {
    ...Type.scoreM,
    color: Colors.text,
  },
  statLabel: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginTop: Space.section,
    marginBottom: Space.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  ratingLabel: {
    ...Type.subhead,
    width: 72,
    color: Colors.textSecondary,
  },
  ratingTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginHorizontal: Space.md,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    backgroundColor: Colors.ink,
  },
  ratingValue: {
    ...Type.number,
    width: 32,
    color: Colors.text,
    textAlign: 'right',
  },
  emptyLine: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  formTag: {
    maxWidth: 140,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
  },
  formTagText: {
    ...Type.tag,
  },
  formOpponent: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  commentItem: {
    flexDirection: 'row',
    gap: Space.md,
    paddingVertical: Space.md,
  },
  commentItemRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    ...Type.headline,
    color: Colors.ink,
  },
  commentContent: {
    flex: 1,
    gap: Space.xxs,
  },
  commentUser: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  commentText: {
    ...Type.body,
    color: Colors.text,
  },
  commentTime: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Space.sm,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  commentInput: {
    ...Type.body,
    flex: 1,
    minHeight: Touch,
    maxHeight: 120,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    paddingTop: Space.md,
    paddingBottom: Space.md,
    color: Colors.text,
  },
  sendBtn: {
    width: Touch,
    height: Touch,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.scrim,
  },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Space.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.xl,
  },
  modalTitle: {
    ...Type.title,
    flex: 1,
    color: Colors.text,
  },
  modalSubtitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
    paddingHorizontal: Space.xl,
  },
  closeBtn: {
    width: 44,
    height: 44,
    marginRight: -Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flexGrow: 0,
  },
  modalContentPadding: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: Space.lg,
  },
  label: {
    ...Type.subhead,
    color: Colors.text,
    marginBottom: Space.sm,
  },
  labelSpaced: {
    marginTop: Space.xxl,
  },
  input: {
    ...Type.body,
    height: Touch,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Space.md,
    color: Colors.text,
  },
  helperText: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginTop: Space.xs + 2,
  },
  coverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  coverOption: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  coverOptionActive: {
    borderWidth: 3,
    borderColor: Colors.ink,
  },
  coverOptionImage: {
    width: '100%',
    height: '100%',
  },
  coverOptionNone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.xs + 2,
  },
  coverOptionNoneText: {
    ...Type.caption,
    color: Colors.textSecondary,
  },
  profileError: {
    ...Type.footnote,
    color: Colors.error,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Space.md,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.lg,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
    minHeight: Touch,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.ink,
  },
  cancelButtonText: {
    ...Type.headline,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
});
