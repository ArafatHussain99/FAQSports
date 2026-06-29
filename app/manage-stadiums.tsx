import React, { use, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Check, X, Plus, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useData } from '@/context/AppContext';
import { addGround, getGrounds } from '@/app/api/matchesApi';

export default function ManageStadiumsScreen() {
  const router = useRouter();
  const { grounds, setGrounds } = useData();

  const [groundName, setGroundName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch grounds when component mounts
    const fetchGrounds = async () => {
      try {
        const fetchedGrounds = await getGrounds();
        setGrounds(fetchedGrounds);
      } catch (error) {
        console.error('Error fetching stadiums:', error);
        Alert.alert('Error', 'Failed to load stadiums. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrounds();
  }, []);

  const handleAddGround = async () => {
    if (!groundName.trim()) {
      Alert.alert('Error', 'Please enter a stadium name');
      return;
    }

    setIsLoading(true);
    try {
      await addGround(groundName.trim(), location.trim() || undefined);

      // Add to local state
      setGrounds([...grounds, groundName.trim()]);

      // Reset form
      setGroundName('');
      setLocation('');

      Alert.alert('Success', 'Stadium added successfully');
    } catch (error) {
      console.error('Error adding stadium:', error);
      Alert.alert('Error', 'Failed to add stadium. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGround = (groundToDelete: string) => {
    Alert.alert(
      'Delete Stadium',
      `Are you sure you want to delete "${groundToDelete}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setGrounds(grounds.filter(g => g !== groundToDelete));
            Alert.alert('Deleted', 'Stadium removed successfully');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Manage Stadiums',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 12, color: Colors.textMuted }}>Loading stadiums...</Text>
        </View>
      ) : <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Add Stadium Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Add New Stadium</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Stadium Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter stadium name"
                placeholderTextColor={Colors.textMuted}
                value={groundName}
                onChangeText={setGroundName}
                editable={!isLoading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor={Colors.textMuted}
                value={location}
                onChangeText={setLocation}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, isLoading && styles.addButtonDisabled]}
              onPress={handleAddGround}
              disabled={isLoading}
            >
              {(
                <>
                  <Plus size={18} color={Colors.background} />
                  <Text style={styles.addButtonText}>Add Stadium</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Stadiums List */}
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>
              Existing Stadiums ({grounds.length})
            </Text>

            {grounds.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No stadiums added yet</Text>
              </View>
            ) : (
              <View style={styles.stadiumsList}>
                {grounds.map((ground, index) => (
                  <View
                    key={index}
                    style={[
                      styles.stadiumItem,
                      index === grounds.length - 1 && styles.stadiumItemLast,
                    ]}
                  >
                    <View style={styles.stadiumContent}>
                      <Text style={styles.stadiumName}>{ground}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteGround(ground)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={18} color={Colors.live} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  headerBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 32,
  },
  listSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  stadiumsList: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stadiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stadiumItemLast: {
    borderBottomWidth: 0,
  },
  stadiumContent: {
    flex: 1,
  },
  stadiumName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
