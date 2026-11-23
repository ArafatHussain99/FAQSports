import { updatePlayerProfile } from '@/api/playerApi';
import Colors from '@/constants/colors';
import { getPlayerCover, PLAYER_COVERS } from '@/constants/playerCovers';
import { useApp, useData } from '@/context/AppContext';
import { Comment } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Award, Ban, MessageCircle, Pencil, Send, Shield, Target, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NICKNAME_MAX_LENGTH = 30;

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

  // Team colour tint behind the cover when no picture is chosen.
  const coverFallbackColor =
    team?.color && /^#[0-9A-Fa-f]{6}$/.test(team.color) ? `${team.color}40` : Colors.surface;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title: player.name }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.cover, { backgroundColor: coverFallbackColor }, cover && { height: 360 }]}>
          {cover && (
            <Image
              source={cover.source}
              style={styles.coverImage}
              resizeMode="cover"
              accessibilityLabel={`${player.name}'s cover picture`}
            />
          )}
          <LinearGradient
            colors={['transparent', Colors.card] as const}
            style={styles.coverGradient}
            pointerEvents="none"
          />
          {isAdmin && (
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={openEditProfile}
              accessibilityRole="button"
              accessibilityLabel="Edit nickname and cover picture"
            >
              <Pencil size={14} color={Colors.text} />
              <Text style={styles.editProfileBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {<Text style={styles.avatarText}>{player.name.charAt(0)}</Text>}
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{player.ratings.overall}</Text>
            </View>
          </View>

          <Text style={styles.playerName}>{player.name}</Text>
          {player.nickname && (
            <Text style={styles.playerNickname}>&ldquo;{player.nickname}&rdquo;</Text>
          )}
          <Text style={styles.playerPosition}>{player.position || 'Player'}</Text>

          {team && (
            <View style={styles.teamBadge}>
              <View style={[styles.teamDot, { backgroundColor: team.color }]} />
              <Text style={styles.teamName}>{team.name}</Text>
            </View>
          )}

          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{player.stats.matches}</Text>
              <Text style={styles.quickStatLabel}>Matches</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{player.stats.runs}</Text>
              <Text style={styles.quickStatLabel}>Runs</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{player.stats.wickets}</Text>
              <Text style={styles.quickStatLabel}>Wickets</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Ratings</Text>
          <View style={styles.ratingsCard}>
            <View style={styles.ratingRow}>
              <View style={[styles.ratingIcon, { backgroundColor: `${Colors.primary}20` }]}>
                <Target size={18} color={Colors.primary} />
              </View>
              <Text style={styles.ratingLabel}>Batting</Text>
              <View style={styles.ratingBarContainer}>
                <View style={[styles.ratingBar, { width: `${player.ratings.batting}%`, backgroundColor: Colors.primary }]} />
              </View>
              <Text style={styles.ratingValue}>{player.ratings.batting}</Text>
            </View>
            <View style={styles.ratingRow}>
              <View style={[styles.ratingIcon, { backgroundColor: `${Colors.secondary}20` }]}>
                <Award size={18} color={Colors.secondary} />
              </View>
              <Text style={styles.ratingLabel}>Bowling</Text>
              <View style={styles.ratingBarContainer}>
                <View style={[styles.ratingBar, { width: `${player.ratings.bowling}%`, backgroundColor: Colors.secondary }]} />
              </View>
              <Text style={styles.ratingValue}>{player.ratings.bowling}</Text>
            </View>
            <View style={styles.ratingRow}>
              <View style={[styles.ratingIcon, { backgroundColor: `${Colors.accent}20` }]}>
                <Shield size={18} color={Colors.accent} />
              </View>
              <Text style={styles.ratingLabel}>Fielding</Text>
              <View style={styles.ratingBarContainer}>
                <View style={[styles.ratingBar, { width: `${player.ratings.fielding}%`, backgroundColor: Colors.accent }]} />
              </View>
              <Text style={styles.ratingValue}>{player.ratings.fielding}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batting Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.runs}</Text>
              <Text style={styles.statBoxLabel}>Runs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.balls}</Text>
              <Text style={styles.statBoxLabel}>Balls</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.average.toFixed(1)}</Text>
              <Text style={styles.statBoxLabel}>Average</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.strikeRate.toFixed(1)}</Text>
              <Text style={styles.statBoxLabel}>Strike Rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.highestScore}</Text>
              <Text style={styles.statBoxLabel}>Highest</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.fifties}</Text>
              <Text style={styles.statBoxLabel}>50s</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.centuries}</Text>
              <Text style={styles.statBoxLabel}>100s</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bowling Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.wickets}</Text>
              <Text style={styles.statBoxLabel}>Wickets</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.economyRate.toFixed(1)}</Text>
              <Text style={styles.statBoxLabel}>Economy</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.bestBowling}</Text>
              <Text style={styles.statBoxLabel}>Best</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fielding Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.catches}</Text>
              <Text style={styles.statBoxLabel}>Catches</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.runOuts}</Text>
              <Text style={styles.statBoxLabel}>Run Outs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.stumpings}</Text>
              <Text style={styles.statBoxLabel}>Stumpings</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.goals ?? 0}</Text>
              <Text style={styles.statBoxLabel}>Goals</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.assists ?? 0}</Text>
              <Text style={styles.statBoxLabel}>Assists</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>{player.stats.wins ?? 0}</Text>
              <Text style={styles.statBoxLabel}>Wins</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 20 }]}>
          <View style={styles.commentsHeader}>
            <MessageCircle size={18} color={Colors.text} />
            <Text style={styles.sectionTitle}>Comments</Text>
          </View>

          {comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{comment.userName.charAt(0)}</Text>
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
          style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
          onPress={handleAddComment}
          disabled={!newComment.trim()}
        >
          <Send size={20} color={newComment.trim() ? Colors.background : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal (admin only) */}
      <Modal
        visible={isAdmin && isEditing}
        transparent
        animationType="slide"
        onRequestClose={closeEditProfile}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>Edit Profile - {player.name}</Text>
            <TouchableOpacity
              onPress={closeEditProfile}
              disabled={isSavingProfile}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

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

            <Text style={[styles.label, styles.labelSpaced]}>Cover Picture</Text>
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
                  <Ban size={22} color={Colors.textMuted} />
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
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                (isSavingProfile || !profileChanged) && styles.disabledButton,
              ]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile || !profileChanged}
            >
              <Text style={styles.saveButtonText}>{isSavingProfile ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  cover: {
    height: 200,
    overflow: 'hidden',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  editProfileBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  header: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginTop: -56,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  playerNickname: {
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.primary,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.card,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  ratingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingLabel: {
    width: 60,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    borderRadius: 4,
  },
  ratingValue: {
    width: 28,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '31%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noComments: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
  },
  modalContentPadding: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  labelSpaced: {
    marginTop: 24,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  coverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  coverOption: {
    width: 104,
    height: 104,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: Colors.surface,
  },
  coverOptionActive: {
    borderColor: Colors.primary,
  },
  coverOptionImage: {
    width: '100%',
    height: '100%',
  },
  coverOptionNone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  coverOptionNoneText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  profileError: {
    color: Colors.error,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
