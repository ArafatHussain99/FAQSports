import { getUserRole, signIn, signUp } from '@/api/authApi';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const { setRole, runWithGlobalLoading } = useApp();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthenticate = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await runWithGlobalLoading(() => signUp(email.trim(), password.trim(), fullName.trim()), 'Creating account...');
        Alert.alert('Success', 'Account created! Please sign in with your credentials.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setFullName('');
      } else {
        await runWithGlobalLoading(() => signIn(email.trim().toLocaleLowerCase(), password.trim()), 'Signing in...');

        // Fetch user role from profile
        const userRole = await runWithGlobalLoading(() => getUserRole(email.trim().toLocaleLowerCase()), 'Loading profile...');

        if (!userRole) {
          Alert.alert('Error', 'Unable to load user role. Please try again.');
          return;
        }

        // Set role in app context and wait for it to persist before navigating
        await setRole(userRole, email.trim().toLocaleLowerCase().split('@')[0]);
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
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
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">FAQ Sports</Text>
              <Text style={styles.subtitle}>Matches, scores and players for FAQ.</Text>
            </View>

            {/* Sign in / sign up segmented control */}
            <View style={styles.segment} accessibilityRole="tablist">
              <TouchableOpacity
                style={[styles.segmentItem, !isSignUp && styles.segmentItemActive]}
                onPress={() => setIsSignUp(false)}
                accessibilityRole="tab"
                accessibilityState={{ selected: !isSignUp }}
              >
                <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentItem, isSignUp && styles.segmentItemActive]}
                onPress={() => setIsSignUp(true)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSignUp }}
              >
                <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {/* Full Name - Only for Sign Up */}
              {isSignUp && (
                <View style={styles.field}>
                  <Text style={styles.label}>Full name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    editable={!isLoading}
                    accessibilityLabel="Full name"
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                  accessibilityLabel="Email address"
                />
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                  accessibilityLabel="Password"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.disabled]}
              onPress={handleAuthenticate}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
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
    paddingHorizontal: Space.xl,
    paddingTop: Space.xxxl * 2,
    paddingBottom: Space.xxl,
  },
  header: {
    marginBottom: Space.xxxl,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
    marginBottom: Space.xs,
  },
  subtitle: {
    ...Type.body,
    color: Colors.textSecondary,
  },
  segment: {
    flexDirection: 'row',
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
    marginBottom: Space.xxl,
  },
  segmentItem: {
    flex: 1,
    minHeight: Touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -Hairline,
  },
  segmentItemActive: {
    borderBottomColor: Colors.ink,
  },
  segmentText: {
    ...Type.bodyStrong,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.text,
  },
  form: {
    gap: Space.lg,
    marginBottom: Space.xxl,
  },
  field: {
    gap: Space.sm,
  },
  label: {
    ...Type.subhead,
    fontWeight: '600',
    color: Colors.text,
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
    paddingHorizontal: Space.xxl,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    ...Type.headline,
    color: Colors.onPrimary,
  },
});
