import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/context/AppContext';
import { grounds } from '@/mocks/data';

type Step = 'basics' | 'players';

export default function CreateTableTennisMatchScreen() {
  const router = useRouter();
  const { players } = useData();

  const [step, setStep] = useState<Step>('basics');
  const [format, setFormat] = useState<'single' | 'double'>('single');
  const [selectedGround, setSelectedGround] = useState(grounds[0]);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [partnerA, setPartnerA] = useState('');
  const [partnerB, setPartnerB] = useState('');

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return format && selectedGround;
      case 'players':
        if (format === 'single') {
          return playerA && playerB && playerA !== playerB;
        } else {
          return playerA && playerB && partnerA && partnerB &&
            playerA !== playerB && partnerA !== partnerB &&
            playerA !== partnerA && playerA !== partnerB &&
            playerB !== partnerA && playerB !== partnerB;
        }
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'basics') setStep('players');
    else if (step === 'players') handleCreateMatch();
  };

  const handleBack = () => {
    if (step === 'players') setStep('basics');
    else router.back();
  };

  const handleCreateMatch = () => {
    Alert.alert(
      'Start Match?',
      'Do you want to start the match now or save it as upcoming?',
      [
        {
          text: 'Save as Upcoming',
          onPress: () => {
            // Save to upcoming matches
            router.back();
          },
        },
        {
          text: 'Start Now',
          style: 'default',
          onPress: () => {
            // Start match now
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Table Tennis Match',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.progressContainer}>
        {['basics', 'players'].map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['basics', 'players'].indexOf(step) > i && styles.progressDotCompleted,
            ]}>
              {['basics', 'players'].indexOf(step) > i && (
                <Check size={12} color={Colors.background} />
              )}
            </View>
            {i < 1 && <View style={[
              styles.progressLine,
              ['basics', 'players'].indexOf(step) > i && styles.progressLineActive,
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
              <TouchableOpacity
                style={[styles.optionChip, styles.optionChipWide, format === 'single' && styles.optionChipActive]}
                onPress={() => setFormat('single')}
              >
                <Text style={[styles.optionText, format === 'single' && styles.optionTextActive]}>
                  Singles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionChip, styles.optionChipWide, format === 'double' && styles.optionChipActive]}
                onPress={() => setFormat('double')}
              >
                <Text style={[styles.optionText, format === 'double' && styles.optionTextActive]}>
                  Doubles
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Venue</Text>
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

        {step === 'players' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Players</Text>

            <View style={styles.playerSection}>
              <Text style={styles.sectionLabel}>Team A / Player 1</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsContent}
              >
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerChip, playerA === player.id && styles.playerChipActive]}
                    onPress={() => setPlayerA(player.id)}
                  >
                    <Text style={[styles.playerChipText, playerA === player.id && styles.playerChipTextActive]}>
                      {player.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.playerSection}>
              <Text style={styles.sectionLabel}>Team B / Player 2</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsContent}
              >
                {players.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerChip, playerB === player.id && styles.playerChipActive]}
                    onPress={() => setPlayerB(player.id)}
                  >
                    <Text style={[styles.playerChipText, playerB === player.id && styles.playerChipTextActive]}>
                      {player.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {format === 'double' && (
              <>
                <View style={styles.playerSection}>
                  <Text style={styles.sectionLabel}>Partner for Team A</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionsScrollView}
                    contentContainerStyle={styles.optionsContent}
                  >
                    {players.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerChip, partnerA === player.id && styles.playerChipActive]}
                        onPress={() => setPartnerA(player.id)}
                      >
                        <Text style={[styles.playerChipText, partnerA === player.id && styles.playerChipTextActive]}>
                          {player.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.playerSection}>
                  <Text style={styles.sectionLabel}>Partner for Team B</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionsScrollView}
                    contentContainerStyle={styles.optionsContent}
                  >
                    {players.map((player) => (
                      <TouchableOpacity
                        key={player.id}
                        style={[styles.playerChip, partnerB === player.id && styles.playerChipActive]}
                        onPress={() => setPartnerB(player.id)}
                      >
                        <Text style={[styles.playerChipText, partnerB === player.id && styles.playerChipTextActive]}>
                          {player.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </>
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
    borderColor: Colors.tableTennis,
    backgroundColor: Colors.tableTennis,
  },
  progressDotCompleted: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  progressLine: {
    width: 16,
    height: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: Colors.tableTennis,
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
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
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
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
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  groundText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  groundTextActive: {
    color: Colors.background,
  },
  playerSection: {
    marginBottom: 20,
  },
  playerChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  playerChipActive: {
    backgroundColor: Colors.tableTennis,
    borderColor: Colors.tableTennis,
  },
  playerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  playerChipTextActive: {
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
    backgroundColor: Colors.tableTennis,
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
