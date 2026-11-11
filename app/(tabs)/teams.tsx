import Colors from '@/constants/colors';
import { useApp, useData } from '@/context/AppContext';
import { Player } from '@/types';
import { TypePlayerInfo } from '@/types/player';
import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Trash2, Users, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  I18nManager,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deletePlayerInfo, uploadPlayerInfo } from '../api/playerApi';
import { deleteTeamInfo, uploadTeamInfo } from '../api/teamApi';

type TabType = 'teams' | 'players';
type ModalType = 'addPlayer' | 'editPlayerTeam' | 'addTeam' | null;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  isAdmin: boolean;
}

function SwipeableCard({ children, onDelete, isAdmin }: SwipeableCardProps) {
  const swipeValue = useRef(new Animated.Value(0)).current;
  const isRTL = I18nManager.isRTL;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isAdmin,
      onMoveShouldSetPanResponder: () => isAdmin,
      onPanResponderMove: (evt, { dx }) => {
        // For RTL, reverse the direction
        const swipeDistance = isRTL ? -dx : dx;
        if (isAdmin && swipeDistance < 0) {
          swipeValue.setValue(Math.max(swipeDistance, -100));
        }
      },
      onPanResponderRelease: (evt, { dx, vx }) => {
        if (isAdmin) {
          const swipeDistance = isRTL ? -dx : dx;
          const swipeVelocity = isRTL ? -vx : vx;

          if (swipeDistance < -40 && swipeVelocity < 0) {
            // Full swipe to delete
            Animated.spring(swipeValue, {
              toValue: -100,
              useNativeDriver: false,
              speed: 12,
              bounciness: 4,
            }).start();
          } else {
            // Reset
            Animated.spring(swipeValue, {
              toValue: 0,
              useNativeDriver: false,
              speed: 12,
              bounciness: 4,
            }).start();
          }
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.spring(swipeValue, {
      toValue: 0,
      useNativeDriver: false,
    }).start(() => {
      onDelete();
    });
  };

  return (
    <View style={styles.swipeContainer}>
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Trash2 size={20} color={Colors.background} />
      </TouchableOpacity>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.swipeContent,
          {
            transform: [{ translateX: swipeValue }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

export default function TeamsScreen() {
  const router = useRouter();
  const { isAdmin, runWithGlobalLoading } = useApp();
  const { teams, players, getTeamPlayers, refetchTeams, refetchPlayers } = useData();
  const [activeTab, setActiveTab] = useState<TabType>('teams');
  const [refreshing, setRefreshing] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Add Player Form State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('');
  const [newPlayerTeamId, setNewPlayerTeamId] = useState<string>('');
  const [newPlayerBatting, setNewPlayerBatting] = useState('right');
  const [newPlayerBowling, setNewPlayerBowling] = useState('');

  // Add Team Form State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#2ECC71');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await runWithGlobalLoading(() => Promise.all([refetchTeams(), refetchPlayers()]), 'Refreshing team data...');
    } finally {
      setRefreshing(false);
    }
  }, [refetchTeams, refetchPlayers, runWithGlobalLoading]);

  // Get next player ID
  const getNextPlayerId = () => {
    const maxId = Math.max(0, ...players.map(p => parseInt(p.id.replace('p', '')) || 0));
    return `p${maxId + 1}`;
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter player name');
      return;
    }

    const newPlayer: TypePlayerInfo = {
      id: getNextPlayerId(),
      name: newPlayerName,
      cricket_team: newPlayerTeamId || undefined,
      position: newPlayerPosition,
      batting_style: newPlayerBatting as 'right' | 'left',
      bowling_style: newPlayerBowling,
      ratings: { batting: 0, bowling: 0, fielding: 0, overall: 0 },
    };

    // const newPlayerStats: TypePlayerStats = {
    //   matches: 0,
    //   runs: 0,
    //   balls: 0,
    //   wickets: 0,
    //   catches: 0,
    //   runOuts: 0,
    //   stumpings: 0,
    //   highestScore: 0,
    //   bestBowlingWickets: 0,
    //   bestBowlingRuns: 0,
    //   fifties: 0,
    //   centuries: 0,
    //   average: 0,
    //   strikeRate: 0,
    //   economyRate: 0,
    //   goals: 0,
    //   assists: 0,
    //   wins: 0,
    // }

    uploadPlayerInfo(newPlayer);


    setEditingPlayer(null);
    setModalType(null);
  };

  const handleAddTeam = async () => {
    const teamName = newTeamName.trim();
    const teamShortName = newTeamShortName.trim();

    if (!teamName || !teamShortName) {
      Alert.alert('Error', 'Please enter team name and short name');
      return;
    }

    setNewTeamName('');
    setNewTeamShortName('');
    setNewTeamColor('#2ECC71');
    setModalType(null);

    try {
      await runWithGlobalLoading(async () => {
        await uploadTeamInfo({
          name: teamName,
          short_name: teamShortName,
          color: newTeamColor,
        });

        await Promise.all([refetchTeams(), refetchPlayers()]);
      }, 'Saving team...');

      Alert.alert('Success', `Team ${teamName} added successfully!`);
    } catch (error) {
      console.error('Error adding team:', error);
      Alert.alert('Error', 'Failed to add team. Please try again.');
    }
  };

  const handleDeleteTeam = (team: any) => {
    Alert.alert(
      'Delete Team',
      `Are you sure you want to delete "${team.name}"? Players will remain in the database but will not be assigned to any team.`,
      [
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            deleteTeamInfo(team.id);
            await runWithGlobalLoading(async () => {
              deleteTeamInfo(team.id);

              await Promise.all([refetchTeams(), refetchPlayers()]);
            }, 'Deleting team...');
            Alert.alert('Success', `Team ${team.name} deleted successfully!`);
          },
        },
      ]
    );
  };

  const handleDeletePlayer = (player: Player) => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete "${player.name}"?`,
      [
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlayerInfo(player.id);
            Alert.alert('Success', `Player ${player.name} deleted successfully!`);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Teams & Players</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalType(activeTab === 'teams' ? 'addTeam' : 'addPlayer')}
            >
              <Plus size={20} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'teams' && styles.tabActive]}
            onPress={() => setActiveTab('teams')}
          >
            <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>
              Teams ({teams.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'players' && styles.tabActive]}
            onPress={() => setActiveTab('players')}
          >
            <Text style={[styles.tabText, activeTab === 'players' && styles.tabTextActive]}>
              Players ({players.length})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {activeTab === 'teams' && (
          <View style={styles.listContainer}>
            {teams.map((team) => {
              const teamPlayers = getTeamPlayers(team.id);
              return (
                <SwipeableCard
                  key={team.id}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeleteTeam(team)}
                >
                  <TouchableOpacity
                    style={styles.teamCard}
                    onPress={() => router.push(`/team/${team.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.teamLogo, { backgroundColor: team.color }]}>
                      <Text style={styles.teamInitials}>{team.shortName}</Text>
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{team.name}</Text>
                      <View style={styles.teamMeta}>
                        <Users size={14} color={Colors.textMuted} />
                        <Text style={styles.teamMetaText}>{teamPlayers.length} players</Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </SwipeableCard>
              );
            })}
          </View>
        )}

        {activeTab === 'players' && (
          <View style={styles.listContainer}>
            {players.map((player) => (
              <SwipeableCard
                key={player.id}
                isAdmin={isAdmin}
                onDelete={() => handleDeletePlayer(player)}
              >
                <View style={styles.playerCard}>
                  <TouchableOpacity
                    style={styles.playerCardContent}
                    onPress={() => router.push(`/player/${player.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerInitial}>{player.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerPosition}>{player.position || 'Player'}</Text>
                      {player.teamId && (
                        <Text style={styles.playerTeam}>
                          {teams.find(t => t.id === player.teamId)?.name || 'Unknown'}
                        </Text>
                      )}
                      {!player.teamId && (
                        <Text style={styles.playerNoTeam}>No team assigned</Text>
                      )}
                    </View>
                    <View style={styles.playerStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{player.stats.runs}</Text>
                        <Text style={styles.statLabel}>Runs</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{player.stats.wickets}</Text>
                        <Text style={styles.statLabel}>Wkts</Text>
                      </View>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingValue}>{player.ratings.overall}</Text>
                    </View>
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.editTeamBtn}
                      onPress={() => {
                        setEditingPlayer(player);
                        setModalType('editPlayerTeam');
                      }}
                    >
                      <Text style={styles.editTeamBtnText}>Team</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </SwipeableCard>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Add Player Modal */}
      <Modal visible={modalType === 'addPlayer'} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Player</Text>
            <TouchableOpacity onPress={() => setModalType(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Player Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter player name"
                placeholderTextColor={Colors.textMuted}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Position</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., All-rounder, Batsman, Bowler"
                placeholderTextColor={Colors.textMuted}
                value={newPlayerPosition}
                onChangeText={setNewPlayerPosition}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Batting Style</Text>
              <View style={styles.buttonsRow}>
                {['right', 'left'].map(style => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.optionButton,
                      newPlayerBatting === style && styles.optionButtonActive,
                    ]}
                    onPress={() => setNewPlayerBatting(style)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        newPlayerBatting === style && styles.optionButtonTextActive,
                      ]}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}-handed
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bowling Style</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Right-arm medium, Left-arm spin"
                placeholderTextColor={Colors.textMuted}
                value={newPlayerBowling}
                onChangeText={setNewPlayerBowling}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Assign Team (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamSelectScroll}>
                <TouchableOpacity
                  style={[
                    styles.teamSelectButton,
                    !newPlayerTeamId && styles.teamSelectButtonActive,
                  ]}
                  onPress={() => setNewPlayerTeamId('')}
                >
                  <Text
                    style={[
                      styles.teamSelectButtonText,
                      !newPlayerTeamId && styles.teamSelectButtonTextActive,
                    ]}
                  >
                    No Team
                  </Text>
                </TouchableOpacity>
                {teams.map(team => (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.teamSelectButton,
                      newPlayerTeamId === team.id && styles.teamSelectButtonActive,
                    ]}
                    onPress={() => setNewPlayerTeamId(team.id)}
                  >
                    <Text
                      style={[
                        styles.teamSelectButtonText,
                        newPlayerTeamId === team.id && styles.teamSelectButtonTextActive,
                      ]}
                    >
                      {team.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleAddPlayer}
            >
              <Text style={styles.submitButtonText}>Add Player</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Player Team Modal */}
      <Modal visible={modalType === 'editPlayerTeam'} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Change Team - {editingPlayer?.name}
            </Text>
            <TouchableOpacity onPress={() => setModalType(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
            <TouchableOpacity
              style={[
                styles.teamListItem,
                !editingPlayer?.teamId && styles.teamListItemActive,
              ]}
              onPress={() => editingPlayer}
            >
              <View style={styles.teamListItemContent}>
                <Text
                  style={[
                    styles.teamListItemText,
                    !editingPlayer?.teamId && styles.teamListItemTextActive,
                  ]}
                >
                  No Team
                </Text>
              </View>
              {!editingPlayer?.teamId && (
                <View style={styles.checkmark} />
              )}
            </TouchableOpacity>

            {teams.map(team => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.teamListItem,
                  editingPlayer?.teamId === team.id && styles.teamListItemActive,
                ]}
                onPress={() => editingPlayer}
              >
                <View style={[styles.teamListItemDot, { backgroundColor: team.color }]} />
                <View style={styles.teamListItemContent}>
                  <Text
                    style={[
                      styles.teamListItemText,
                      editingPlayer?.teamId === team.id && styles.teamListItemTextActive,
                    ]}
                  >
                    {team.name}
                  </Text>
                  <Text style={styles.teamListItemSubtext}>
                    {getTeamPlayers(team.id).length} players
                  </Text>
                </View>
                {editingPlayer?.teamId === team.id && (
                  <View style={styles.checkmark} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.submitButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Add Team Modal */}
      <Modal visible={modalType === 'addTeam'} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Team</Text>
            <TouchableOpacity onPress={() => setModalType(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter team name"
                placeholderTextColor={Colors.textMuted}
                value={newTeamName}
                onChangeText={setNewTeamName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Short Name (2-4 chars) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., MIS, ARC"
                placeholderTextColor={Colors.textMuted}
                value={newTeamShortName}
                onChangeText={setNewTeamShortName}
                maxLength={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Color</Text>
              <View style={styles.colorPickerContainer}>
                {['#2ECC71', '#E74C3C', '#3498DB', '#F39C12', '#9B59B6', '#1ABC9C'].map(
                  color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newTeamColor === color && styles.colorOptionActive,
                      ]}
                      onPress={() => setNewTeamColor(color)}
                    >
                      {newTeamColor === color && (
                        <View style={styles.colorOptionCheck} />
                      )}
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleAddTeam}
            >
              <Text style={styles.submitButtonText}>Add Team</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  teamCard: {
    backgroundColor: Colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    height: 110,
  },
  teamCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  teamInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamMetaText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playerCard: {
    backgroundColor: Colors.card,
    height: 110,
  },
  playerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  playerTeam: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  playerNoTeam: {
    fontSize: 11,
    color: Colors.warning,
    marginTop: 2,
    fontStyle: 'italic',
  },
  playerStats: {
    flexDirection: 'row',
    gap: 16,
    marginRight: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  ratingBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.background,
  },
  swipeContainer: {
    position: 'relative',
    height: 110,
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 16,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    zIndex: 1,
  },
  swipeContent: {
    flex: 1,
    zIndex: 2,
  },
  editTeamBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTeamBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
  },
  modalContentPadding: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  optionButtonTextActive: {
    color: Colors.background,
  },
  teamSelectScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  teamSelectButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  teamSelectButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  teamSelectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  teamSelectButtonTextActive: {
    color: Colors.background,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: Colors.text,
  },
  colorOptionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  teamListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  teamListItemActive: {
    backgroundColor: Colors.primary,
  },
  teamListItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  teamListItemContent: {
    flex: 1,
  },
  teamListItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  teamListItemTextActive: {
    color: Colors.background,
  },
  teamListItemSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});
