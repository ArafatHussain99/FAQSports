import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData, useFootballMatches } from '@/context/AppContext';
import { FootballMatch, FootballMatchFormat } from '@/types';
import { grounds } from '@/mocks/data';

type Step = 'basics' | 'teams' | 'players';

export const footballMatchFormats: { key: FootballMatchFormat; label: string }[] = [
  { key: 'friendly', label: 'Friendly' },
  { key: 'league', label: 'League' },
  { key: 'knockout', label: 'Knockout' },
];

export default function CreateFootballMatchScreen() {
  const router = useRouter();
  const { teams, getTeamPlayers } = useData();
  const { setUpcomingMatches, setCurrentMatch } = useFootballMatches();

  const [step, setStep] = useState<Step>('basics');
  const [format, setFormat] = useState<FootballMatchFormat>('friendly');
  const [duration, setDuration] = useState('90');
  const [totalPlayersEachSide, setTotalPlayersEachSide] = useState('11');
  const [selectedGround, setSelectedGround] = useState(grounds[0]);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [playingXI_A, setPlayingXI_A] = useState<string[]>([]);
  const [playingXI_B, setPlayingXI_B] = useState<string[]>([]);

  const teamAData = teams.find(t => t.id === teamA);
  const teamBData = teams.find(t => t.id === teamB);
  const teamAPlayers = getTeamPlayers(teamA);
  const teamBPlayers = getTeamPlayers(teamB);

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return format && duration && selectedGround;
      case 'teams':
        return teamA && teamB && teamA !== teamB;
      case 'players':
        return playingXI_A.length >= 1 && playingXI_B.length >= 1;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'basics') setStep('teams');
    else if (step === 'teams') setStep('players');
    else if (step === 'players') handleCreateMatch();
  };

  const handleBack = () => {
    if (step === 'teams') setStep('basics');
    else if (step === 'players') setStep('teams');
    else router.back();
  };

  const handleCreateMatch = () => {
    const newMatch: FootballMatch = {
      id: `match_${Date.now()}`,
      sport: 'football',
      status: 'upcoming',
      format,
      duration: parseInt(duration, 10),
      ground: selectedGround,
      teamA,
      teamB,
      playingXI_A,
      playingXI_B,
      substitutes_A: [],
      substitutes_B: [],
      score: {
        teamA: 0,
        teamB: 0,
      },
      events: [],
      createdAt: new Date().toISOString(),
    };

    Alert.alert(
      'Start Match?',
      'Do you want to start the match now or save it as upcoming?',
      [
        {
          text: 'Save as Upcoming',
          onPress: () => {
            setUpcomingMatches(prev => [newMatch, ...prev]);
            router.back();
          },
        },
        {
          text: 'Start Now',
          style: 'default',
          onPress: () => {
            setCurrentMatch({ ...newMatch, status: 'live', startedAt: new Date().toISOString() });
            // Note: Create football-live-scoring route later
            router.back();
          },
        },
      ]
    );
  };

  const togglePlayerSelection = (playerId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      setPlayingXI_A(prev =>
        prev.includes(playerId) ? prev.filter(p => p !== playerId) : [...prev, playerId]
      );
    } else {
      setPlayingXI_B(prev =>
        prev.includes(playerId) ? prev.filter(p => p !== playerId) : [...prev, playerId]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Football Match',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.progressContainer}>
        {['basics', 'teams', 'players'].map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['basics', 'teams', 'players'].indexOf(step) > i && styles.progressDotCompleted,
            ]}>
              {['basics', 'teams', 'players'].indexOf(step) > i && (
                <Check size={12} color={Colors.background} />
              )}
            </View>
            {i < 2 && <View style={[
              styles.progressLine,
              ['basics', 'teams', 'players'].indexOf(step) > i && styles.progressLineActive,
            ]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'basics' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Match Details</Text>

            <Text style={styles.label}>Match Format</Text>
            <View style={styles.optionsRow}>
              {footballMatchFormats.map((match) => (
                <TouchableOpacity
                  key={match.key}
                  style={[styles.optionChip, styles.optionChipWide, format === match.key && styles.optionChipActive]}
                  onPress={() => setFormat(match.key)}
                >
                  <Text style={[styles.optionText, format === match.key && styles.optionTextActive]}>
                    {match.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Match Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="e.g., 90"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Players in Each Team</Text>
            <TextInput
              style={styles.input}
              value={totalPlayersEachSide}
              onChangeText={setTotalPlayersEachSide}
              keyboardType="number-pad"
              placeholder="e.g., 11"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Ground/Stadium</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScrollView}
              contentContainerStyle={styles.optionsContent}
            >
              {grounds.map((ground) => (
                <TouchableOpacity
                  key={ground}
                  style={[styles.groundChip, selectedGround === ground && styles.groundChipActive]}
                  onPress={() => setSelectedGround(ground)}
                >
                  <Text style={[styles.groundText, selectedGround === ground && styles.groundTextActive]}>
                    {ground}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {step === 'teams' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Teams</Text>

            <Text style={styles.label}>Team A</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScrollView}
              contentContainerStyle={styles.optionsContent}
            >
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamChip, teamA === team.id && styles.teamChipActive]}
                  onPress={() => setTeamA(team.id)}
                >
                  <Text style={[styles.teamText, teamA === team.id && styles.teamTextActive]}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { marginTop: 20 }]}>Team B</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsScrollView}
              contentContainerStyle={styles.optionsContent}
            >
              {teams.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamChip, teamB === team.id && styles.teamChipActive]}
                  onPress={() => setTeamB(team.id)}
                >
                  <Text style={[styles.teamText, teamB === team.id && styles.teamTextActive]}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {step === 'players' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Players</Text>

            {teamAData && (
              <View style={styles.teamSection}>
                <Text style={styles.teamSectionTitle}>{teamAData.name}</Text>
                <View style={styles.playerGrid}>
                  {teamAPlayers.slice(0, parseInt(totalPlayersEachSide, 10) || 11).map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerChip,
                        playingXI_A.includes(player.id) && styles.playerChipSelected,
                      ]}
                      onPress={() => {
                        if (playingXI_A.includes(player.id) || playingXI_A.length < parseInt(totalPlayersEachSide, 10) || 11) {
                          togglePlayerSelection(player.id, 'A');
                        }
                      }}
                    >
                      <Text style={[styles.playerChipText, playingXI_A.includes(player.id) && styles.playerChipTextSelected]}>
                        {player.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {teamBData && (
              <View style={[styles.teamSection, { marginTop: 20 }]}>
                <Text style={styles.teamSectionTitle}>{teamBData.name}</Text>
                <View style={styles.playerGrid}>
                  {teamBPlayers.slice(0, parseInt(totalPlayersEachSide, 10) || 11).map((player) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerChip,
                        playingXI_B.includes(player.id) && styles.playerChipSelected,
                      ]}
                      onPress={() => {
                        if (playingXI_B.includes(player.id) || playingXI_B.length < parseInt(totalPlayersEachSide, 10) || 11) {
                          togglePlayerSelection(player.id, 'B');
                        }
                      }}
                    >
                      <Text style={[styles.playerChipText, playingXI_B.includes(player.id) && styles.playerChipTextSelected]}>
                        {player.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleBack}
        >
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !canProceed() && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.buttonText}>{step === 'players' ? 'Create' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBtn: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    borderColor: Colors.football,
    backgroundColor: Colors.football,
  },
  progressDotCompleted: {
    backgroundColor: Colors.football,
    borderColor: Colors.football,
  },
  progressLine: {
    width: 16,
    height: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: Colors.football,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  stepContainer: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
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
    marginBottom: 16,
    color: Colors.text,
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  optionChipWide: {
    flex: 1,
  },
  optionChipActive: {
    backgroundColor: Colors.football,
    borderColor: Colors.football,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  optionTextActive: {
    color: Colors.background,
  },
  optionsScrollView: {
    marginBottom: 16,
  },
  optionsContent: {
    paddingRight: 20,
  },
  groundChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  groundChipActive: {
    backgroundColor: Colors.football,
    borderColor: Colors.football,
  },
  groundText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  groundTextActive: {
    color: Colors.background,
  },
  teamChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  teamChipActive: {
    backgroundColor: Colors.football,
    borderColor: Colors.football,
  },
  teamText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  teamTextActive: {
    color: Colors.background,
  },
  teamSection: {
    marginBottom: 16,
  },
  teamSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  playerChip: {
    width: '33.33%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  playerChipInner: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  playerChipSelected: {
    backgroundColor: Colors.football,
  },
  playerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  playerChipTextSelected: {
    backgroundColor: Colors.football,
    borderColor: Colors.football,
    color: Colors.background,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.football,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  cancelButton: {
    backgroundColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});
