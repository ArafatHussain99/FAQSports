import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shield, User, ChevronRight, Trophy } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';

export default function LoginScreen() {
  const router = useRouter();
  const { setRole } = useApp();
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (name.trim() && selectedRole) {
      setRole(selectedRole, name.trim());
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Trophy size={48} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Company Sports Portal</Text>
              <Text style={styles.subtitle}>Manage matches, track scores, and compete</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={[styles.label, { marginTop: 24 }]}>Select Your Role</Text>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'admin' && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole('admin')}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${Colors.adminBadge}20` }]}>
                  <Shield size={28} color={Colors.adminBadge} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.roleName}>Admin</Text>
                  <Text style={styles.roleDescription}>
                    Create matches, manage teams, input live scores
                  </Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedRole === 'admin' && styles.radioOuterSelected,
                ]}>
                  {selectedRole === 'admin' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === 'player' && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole('player')}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${Colors.playerBadge}20` }]}>
                  <User size={28} color={Colors.playerBadge} />
                </View>
                <View style={styles.roleContent}>
                  <Text style={styles.roleName}>Player</Text>
                  <Text style={styles.roleDescription}>
                    View matches, check scores, see statistics
                  </Text>
                </View>
                <View style={[
                  styles.radioOuter,
                  selectedRole === 'player' && styles.radioOuterSelected,
                ]}>
                  {selectedRole === 'player' && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                (!name.trim() || !selectedRole) && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!name.trim() || !selectedRole}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Continue</Text>
              <ChevronRight size={20} color={Colors.background} />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  roleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}08`,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleContent: {
    flex: 1,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 24,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.border,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.background,
    marginRight: 8,
  },
});
