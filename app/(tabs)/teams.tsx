import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';
import { Player } from '@/types';
import { TypePlayerInfo } from '@/types/player';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react-native';
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
import { deletePlayerInfo, updatePlayerTeam, uploadPlayerInfo, uploadPlayerStats } from '@/api/playerApi';
import { deleteTeamInfo, uploadTeamInfo } from '@/api/teamApi';

type TabType = 'teams' | 'players';
type ModalType = 'addPlayer' | 'editPlayerTeam' | 'addTeam' | null;

// Team colour presets, drawn from the sport pin tokens.
const TEAM_COLOR_PRESETS: { color: string; label: string }[] = [
  { color: Colors.cricket, label: 'Green' },
  { color: Colors.tableTennis, label: 'Red' },
  { color: Colors.football, label: 'Blue' },
  { color: Colors.carrom, label: 'Orange' },
  { color: Colors.badminton, label: 'Purple' },
  { color: Colors.uno, label: 'Teal' },
];
const DEFAULT_TEAM_COLOR = TEAM_COLOR_PRESETS[0].color;

// Swipeable Card Component
interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  isAdmin: boolean;
  ruled?: boolean;
}

function SwipeableCard({ children, onDelete, isAdmin, ruled }: SwipeableCardProps) {
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
    <View style={[styles.swipeContainer, ruled && styles.swipeRuled]}>
      {isAdmin && (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={handleDelete}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Delete"
      >
        <Trash2 size={20} color={Colors.textInverse} />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
      )}
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

  // Change Team modal state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [changeTeamError, setChangeTeamError] = useState<string | null>(null);
  const teamChanged = (editingPlayer?.teamId ?? null) !== selectedTeamId;

  // Add Player Form State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('');
  const [newPlayerTeamId, setNewPlayerTeamId] = useState<string>('');
  const [newPlayerBatting, setNewPlayerBatting] = useState('right');
  const [newPlayerBowling, setNewPlayerBowling] = useState('');
  const [isSavingPlayer, setIsSavingPlayer] = useState(false);

  // Add Team Form State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamShortName, setNewTeamShortName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(DEFAULT_TEAM_COLOR);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await runWithGlobalLoading(() => Promise.all([refetchTeams(), refetchPlayers()]), 'Refreshing team data...');
    } finally {
      setRefreshing(false);
    }
  }, [refetchTeams, refetchPlayers, runWithGlobalLoading]);

  const handleAddPlayer = async () => {
    const name = newPlayerName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter player name');
      return;
    }

    const newPlayer: TypePlayerInfo = {
      name,
      team_id: newPlayerTeamId || null,
      position: newPlayerPosition.trim() || null,
      batting_style: newPlayerBatting || null,
      bowling_style: newPlayerBowling.trim() || null,
    };

    setIsSavingPlayer(true);
    try {
      await runWithGlobalLoading(async () => {
        const playerId = await uploadPlayerInfo(newPlayer);
        await uploadPlayerStats({
          player_id: playerId,
          matches: 0,
          runs: 0,
          balls: 0,
          wickets: 0,
          catches: 0,
          run_outs: 0,
          stumpings: 0,
          highest_score: 0,
          best_bowling_wickets: 0,
          fifties: 0,
          centuries: 0,
          batting_average: 0,
          strike_rate: 0,
          economy_rate: 0,
          goals: 0,
          assists: 0,
          wins: 0,
          best_bowling_runs: 0,
        });
        await refetchPlayers();
      }, 'Adding player...');
      setNewPlayerName('');
      setNewPlayerPosition('');
      setNewPlayerTeamId('');
      setNewPlayerBatting('right');
      setNewPlayerBowling('');
      setEditingPlayer(null);
      setModalType(null);
      Alert.alert('Success', `${name} added successfully!`);
    } catch (error) {
      console.error('Error adding player:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? `Failed to add player: ${error.message}` : 'Failed to add player. Please try again.'
      );
    } finally {
      setIsSavingPlayer(false);
    }
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
    setNewTeamColor(DEFAULT_TEAM_COLOR);
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
            try {
              await runWithGlobalLoading(async () => {
                await deleteTeamInfo(team.id);
                await Promise.all([refetchTeams(), refetchPlayers()]);
              }, 'Deleting team...');
              Alert.alert('Success', `Team ${team.name} deleted successfully!`);
            } catch (error) {
              console.error('Error deleting team:', error);
              Alert.alert(
                'Error',
                error instanceof Error ? `Failed to delete team: ${error.message}` : 'Failed to delete team. Please try again.'
              );
            }
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
          onPress: async () => {
            try {
              await runWithGlobalLoading(async () => {
                await deletePlayerInfo(player.id);
                await Promise.all([refetchPlayers(), refetchTeams()]);
              }, 'Deleting player...');
              Alert.alert('Success', `Player ${player.name} deleted successfully!`);
            } catch (error) {
              console.error('Error deleting player:', error);
              Alert.alert(
                'Error',
                error instanceof Error ? `Failed to delete player: ${error.message}` : 'Failed to delete player. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const openChangeTeam = (player: Player) => {
    setEditingPlayer(player);
    setSelectedTeamId(player.teamId ?? null);
    setChangeTeamError(null);
    setModalType('editPlayerTeam');
  };

  const closeChangeTeam = () => {
    if (isSavingTeam) return;
    setModalType(null);
    setEditingPlayer(null);
    setChangeTeamError(null);
  };

  const handleSaveTeam = async () => {
    if (!editingPlayer || !teamChanged) return;

    setIsSavingTeam(true);
    setChangeTeamError(null);
    try {
      await runWithGlobalLoading(async () => {
        await updatePlayerTeam(editingPlayer.id, selectedTeamId);
        await refetchPlayers();
      }, 'Updating team...');
      setModalType(null);
      setEditingPlayer(null);
    } catch (error) {
      console.error('Error changing player team:', error);
      // Shown inside the modal so it is visible on web too (Alert.alert is a no-op there).
      setChangeTeamError(
        error instanceof Error ? error.message : 'Failed to change team. Please try again.'
      );
    } finally {
      setIsSavingTeam(false);
    }
  };

  const getTeam = (teamId?: string | null) => (teamId ? teams.find(t => t.id === teamId) : undefined);

  const renderEmpty = (title: string, subtitle: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'teams', label: 'Teams', count: teams.length },
    { key: 'players', label: 'Players', count: players.length },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Teams & Players</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setModalType(activeTab === 'teams' ? 'addTeam' : 'addPlayer')}
              accessibilityRole="button"
              accessibilityLabel={activeTab === 'teams' ? 'Add team' : 'Add player'}
            >
              <Plus size={22} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segmentRow} accessibilityRole="tablist">
          {tabs.map((t) => {
            const selected = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => setActiveTab(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t.label}, ${t.count}`}
              >
                <Text
                  style={[styles.segmentText, selected && styles.segmentTextSelected]}
                  numberOfLines={1}
                >
                  {t.label} <Text style={styles.segmentCount}>{t.count}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
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
        {activeTab === 'teams' && teams.length === 0 &&
          renderEmpty(
            'No teams yet',
            isAdmin ? 'Tap + to add one.' : 'Ask an admin to add a team. Pull down to refresh.'
          )}

        {activeTab === 'teams' && teams.length > 0 && (
          <View style={styles.group}>
            {teams.map((team, index) => {
              const teamPlayers = getTeamPlayers(team.id);
              return (
                <SwipeableCard
                  key={team.id}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeleteTeam(team)}
                  ruled={index > 0}
                >
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => router.push(`/team/${team.id}`)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${team.name}, ${teamPlayers.length} players`}
                  >
                    <View style={[styles.teamTag, { borderColor: team.color || Colors.ink }]}>
                      <View style={[styles.pin, { backgroundColor: team.color || Colors.ink }]} />
                      <Text style={styles.teamTagText} numberOfLines={1}>{team.shortName}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{team.name}</Text>
                      <Text style={styles.rowSubtitle}>
                        <Text style={styles.number}>{teamPlayers.length}</Text>
                        {teamPlayers.length === 1 ? ' player' : ' players'}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                </SwipeableCard>
              );
            })}
          </View>
        )}

        {activeTab === 'players' && players.length === 0 &&
          renderEmpty(
            'No players yet',
            isAdmin ? 'Tap + to add one.' : 'Ask an admin to add players. Pull down to refresh.'
          )}

        {activeTab === 'players' && players.length > 0 && (
          <View style={styles.group}>
            {players.map((player, index) => {
              const team = getTeam(player.teamId);
              return (
                <SwipeableCard
                  key={player.id}
                  isAdmin={isAdmin}
                  onDelete={() => handleDeletePlayer(player)}
                  ruled={index > 0}
                >
                  <TouchableOpacity
                    style={styles.row}
                    onPress={() => router.push(`/player/${player.id}`)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarInitial}>{player.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{player.name}</Text>
                      <View style={styles.playerMeta}>
                        {player.teamId ? (
                          <>
                            <View style={[styles.pin, { backgroundColor: team?.color || Colors.ink }]} />
                            <Text style={styles.rowSubtitle} numberOfLines={1}>
                              {team?.name || 'Unknown'}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.rowSubtitleMuted} numberOfLines={1}>No team</Text>
                        )}
                        <Text style={styles.rowSubtitleMuted} numberOfLines={1}>
                          {' · '}{player.position || 'Player'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.number}>{player.stats.runs}</Text>
                      <Text style={styles.statLabel}>Runs</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={styles.number}>{player.stats.wickets}</Text>
                      <Text style={styles.statLabel}>Wkts</Text>
                    </View>
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.changeTeamBtn}
                      onPress={() => openChangeTeam(player)}
                      hitSlop={{ top: 8, bottom: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Change team for ${player.name}`}
                    >
                      <Text style={styles.changeTeamText}>Change team</Text>
                    </TouchableOpacity>
                  )}
                </SwipeableCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Player Modal */}
      <Modal visible={modalType === 'addPlayer'} transparent animationType="slide">
        <View style={styles.scrim}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add player</Text>

            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Player name *</Text>
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
                <Text style={styles.label}>Batting style</Text>
                <View style={styles.optionRow}>
                  {['right', 'left'].map(style => {
                    const selected = newPlayerBatting === style;
                    return (
                      <TouchableOpacity
                        key={style}
                        style={[styles.option, styles.optionFlex, selected && styles.optionSelected]}
                        onPress={() => setNewPlayerBatting(style)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {style.charAt(0).toUpperCase() + style.slice(1)}-handed
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Bowling style</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Right-arm medium, Left-arm spin"
                  placeholderTextColor={Colors.textMuted}
                  value={newPlayerBowling}
                  onChangeText={setNewPlayerBowling}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Team (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={styles.chipScrollContent}
                >
                  <TouchableOpacity
                    style={[styles.option, !newPlayerTeamId && styles.optionSelected]}
                    onPress={() => setNewPlayerTeamId('')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: !newPlayerTeamId }}
                  >
                    <Text style={[styles.optionText, !newPlayerTeamId && styles.optionTextSelected]}>
                      No team
                    </Text>
                  </TouchableOpacity>
                  {teams.map(team => {
                    const selected = newPlayerTeamId === team.id;
                    return (
                      <TouchableOpacity
                        key={team.id}
                        style={[styles.option, styles.optionWithPin, selected && styles.optionSelected]}
                        onPress={() => setNewPlayerTeamId(team.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <View style={[styles.pin, { backgroundColor: team.color || Colors.ink }]} />
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {team.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.primaryButton, isSavingPlayer && styles.disabled]}
                onPress={handleAddPlayer}
                disabled={isSavingPlayer}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>{isSavingPlayer ? 'Adding...' : 'Add player'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setModalType(null)}
                accessibilityRole="button"
              >
                <Text style={styles.textButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Edit Player Team Modal */}
      <Modal
        visible={modalType === 'editPlayerTeam'}
        transparent
        animationType="slide"
        onRequestClose={closeChangeTeam}
      >
        <View style={styles.scrim}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle} numberOfLines={2}>
              Change team for {editingPlayer?.name}
            </Text>

            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
              <View style={styles.choiceGroup}>
                <TouchableOpacity
                  style={[styles.choiceRow, !selectedTeamId && styles.choiceRowSelected]}
                  onPress={() => setSelectedTeamId(null)}
                  disabled={isSavingTeam}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !selectedTeamId }}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>No team</Text>
                  </View>
                  {!selectedTeamId && <Check size={20} color={Colors.onHighlight} />}
                </TouchableOpacity>

                {teams.map(team => {
                  const selected = selectedTeamId === team.id;
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.choiceRow, styles.choiceRowRuled, selected && styles.choiceRowSelected]}
                      onPress={() => setSelectedTeamId(team.id)}
                      disabled={isSavingTeam}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View style={[styles.pin, { backgroundColor: team.color || Colors.ink }]} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{team.name}</Text>
                        <Text style={styles.rowSubtitle}>
                          {getTeamPlayers(team.id).length} players
                        </Text>
                      </View>
                      {selected && <Check size={20} color={Colors.onHighlight} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {changeTeamError && (
              <Text style={styles.editError} accessibilityRole="alert">{changeTeamError}</Text>
            )}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.primaryButton, (isSavingTeam || !teamChanged) && styles.disabled]}
                onPress={handleSaveTeam}
                disabled={isSavingTeam || !teamChanged}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>{isSavingTeam ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textButton, isSavingTeam && styles.disabled]}
                onPress={closeChangeTeam}
                disabled={isSavingTeam}
                accessibilityRole="button"
              >
                <Text style={styles.textButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Add Team Modal */}
      <Modal visible={modalType === 'addTeam'} transparent animationType="slide">
        <View style={styles.scrim}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add team</Text>

            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Team name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter team name"
                  placeholderTextColor={Colors.textMuted}
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Short name (2-4 chars) *</Text>
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
                <Text style={styles.label}>Team colour</Text>
                <View style={styles.swatchRow}>
                  {TEAM_COLOR_PRESETS.map(preset => {
                    const selected = newTeamColor === preset.color;
                    return (
                      <TouchableOpacity
                        key={preset.color}
                        style={[styles.swatchRing, selected && styles.swatchRingSelected]}
                        onPress={() => setNewTeamColor(preset.color)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={preset.label}
                      >
                        <View style={[styles.swatch, { backgroundColor: preset.color }]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddTeam}
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Add team</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textButton}
                onPress={() => setModalType(null)}
                accessibilityRole="button"
              >
                <Text style={styles.textButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const SWATCH = 36;
const SWATCH_RING = 3;

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
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    marginRight: -Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Space.xl,
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
  segmentCount: {
    fontVariant: ['tabular-nums'],
    color: Colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: 100,
  },

  // Grouped list
  group: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 1,
    bottom: 1,
    width: 100,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.xxs,
    zIndex: 1,
  },
  deleteActionText: {
    ...Type.caption,
    color: Colors.textInverse,
  },
  swipeContent: {
    backgroundColor: Colors.card,
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: 64,
    paddingVertical: Space.md,
    paddingLeft: Space.lg,
    paddingRight: Space.md,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...Type.bodyStrong,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  rowSubtitleMuted: {
    ...Type.footnote,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  number: {
    ...Type.number,
    color: Colors.text,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    minWidth: 64,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  teamTagText: {
    ...Type.tag,
    color: Colors.text,
    textTransform: 'uppercase',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Type.headline,
    color: Colors.ink,
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs + 2,
    marginTop: Space.xxs,
  },
  stat: {
    alignItems: 'flex-end',
    minWidth: 36,
  },
  statLabel: {
    ...Type.caption,
    color: Colors.textMuted,
  },
  changeTeamBtn: {
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
    marginLeft: Space.lg + 40 + Space.md, // lines up with the player name
    marginTop: -Space.sm,
    marginBottom: Space.sm,
  },
  changeTeamText: {
    ...Type.footnote,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Empty state
  emptyState: {
    paddingTop: Space.section * 2,
    paddingHorizontal: Space.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Type.headline,
    color: Colors.text,
    marginBottom: Space.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Type.subhead,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Bottom sheet
  scrim: {
    flex: 1,
    backgroundColor: Colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    marginTop: Space.sm,
  },
  sheetTitle: {
    ...Type.title,
    color: Colors.text,
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: Space.sm,
  },
  sheetBody: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetBodyContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.sm,
    paddingBottom: Space.sm,
  },
  sheetFooter: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
    gap: Space.xs,
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  formGroup: {
    marginBottom: Space.lg,
  },
  label: {
    ...Type.footnote,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Space.sm,
  },
  input: {
    height: Touch,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    ...Type.body,
    color: Colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionFlex: {
    flex: 1,
  },
  optionWithPin: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  optionSelected: {
    backgroundColor: Colors.highlight,
    borderColor: Colors.highlight,
  },
  optionText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: Colors.onHighlight,
  },
  chipScroll: {
    marginHorizontal: -Space.xl,
  },
  chipScrollContent: {
    paddingHorizontal: Space.xl,
    gap: Space.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
  },
  swatchRing: {
    width: SWATCH + SWATCH_RING * 2 + 4,
    height: SWATCH + SWATCH_RING * 2 + 4,
    borderRadius: (SWATCH + SWATCH_RING * 2 + 4) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRingSelected: {
    borderColor: Colors.ink,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
  },
  choiceGroup: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    minHeight: Touch + 8,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  choiceRowRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  choiceRowSelected: {
    backgroundColor: Colors.highlight,
  },
  editError: {
    ...Type.footnote,
    color: Colors.error,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
  },
  primaryButton: {
    height: Touch,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  textButton: {
    height: Touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonText: {
    ...Type.headline,
    color: Colors.textSecondary,
  },
  disabled: {
    opacity: 0.4,
  },
});
