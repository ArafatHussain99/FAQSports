import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { X, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';
import { addGround, getGrounds } from '@/api/groundApi';

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

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading stadiums...</Text>
        </View>
      ) : <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Add Stadium Form */}
          <Text style={styles.sectionTitle} accessibilityRole="header">Add a stadium</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Stadium name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter stadium name"
                placeholderTextColor={Colors.textMuted}
                value={groundName}
                onChangeText={setGroundName}
                editable={!isLoading}
                accessibilityLabel="Stadium name, required"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Location <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                placeholderTextColor={Colors.textMuted}
                value={location}
                onChangeText={setLocation}
                editable={!isLoading}
                accessibilityLabel="Location, optional"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabled]}
              onPress={handleAddGround}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Add Stadium</Text>
            </TouchableOpacity>
          </View>

          {/* Stadiums List */}
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]} accessibilityRole="header">
            Stadiums ({grounds.length})
          </Text>

          {grounds.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No stadiums yet</Text>
              <Text style={styles.emptyText}>
                Enter a stadium name above and tap Add Stadium to list it here.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {grounds.map((ground, index) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.rowText} numberOfLines={2}>{ground}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteGround(ground)}
                    style={styles.deleteButton}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${ground}`}
                  >
                    <Trash2 size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Type.subhead,
    color: Colors.textSecondary,
    marginTop: Space.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.xxxl + Space.sm,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginBottom: Space.sm,
  },
  sectionTitleSpaced: {
    marginTop: Space.section,
  },
  form: {
    gap: Space.md,
  },
  field: {
    gap: Space.sm,
  },
  label: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.text,
  },
  optional: {
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  input: {
    // Type.body without lineHeight: a fixed lineHeight misaligns TextInput text on iOS.
    fontSize: Type.body.fontSize,
    fontWeight: Type.body.fontWeight,
    height: Touch,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    color: Colors.text,
  },
  primaryButton: {
    height: Touch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    marginTop: Space.xs,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
  list: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Touch + Space.sm,
    gap: Space.md,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  rowText: {
    ...Type.bodyStrong,
    color: Colors.text,
    flex: 1,
    paddingVertical: Space.md,
  },
  deleteButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -Space.md,
  },
  emptyState: {
    borderTopWidth: Hairline,
    borderBottomWidth: Hairline,
    borderColor: Colors.border,
    paddingVertical: Space.xxl,
    gap: Space.xs,
  },
  emptyTitle: {
    ...Type.headline,
    color: Colors.text,
  },
  emptyText: {
    ...Type.subhead,
    color: Colors.textSecondary,
  },
});
