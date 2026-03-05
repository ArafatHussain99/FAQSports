import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User, Shield, LogOut, ChevronRight, Trophy,
  Target, Award, TrendingUp, Settings
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp, useData } from '@/context/AppContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { userName, isAdmin, logout } = useApp();
  const { players } = useData();

  const currentPlayer = players.find(p => p.name.toLowerCase().includes(userName.toLowerCase().split(' ')[0])) || players[0];

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity style={styles.settingsBtn}>
            <Settings size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color={Colors.primary} />
            </View>
            <View style={[styles.roleBadgeProfile, { backgroundColor: isAdmin ? Colors.adminBadge : Colors.playerBadge }]}>
              {isAdmin ? <Shield size={12} color={Colors.text} /> : <User size={12} color={Colors.text} />}
            </View>
          </View>
          <Text style={styles.profileName}>{userName}</Text>
          <Text style={styles.profileRole}>{isAdmin ? 'Administrator' : 'Player'}</Text>
        </View>

        {!isAdmin && currentPlayer && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Trophy size={24} color={Colors.primary} />
                <Text style={styles.statValue}>{currentPlayer.stats.matches}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Target size={24} color={Colors.secondary} />
                <Text style={styles.statValue}>{currentPlayer.stats.runs}</Text>
                <Text style={styles.statLabel}>Runs</Text>
              </View>
              <View style={styles.statCard}>
                <Award size={24} color={Colors.accent} />
                <Text style={styles.statValue}>{currentPlayer.stats.wickets}</Text>
                <Text style={styles.statLabel}>Wickets</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingUp size={24} color={Colors.cricket} />
                <Text style={styles.statValue}>{currentPlayer.ratings.overall}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>

            <View style={styles.ratingsSection}>
              <Text style={styles.sectionTitle}>Skill Ratings</Text>
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>Batting</Text>
                <View style={styles.ratingBarBg}>
                  <View style={[styles.ratingBar, { width: `${currentPlayer.ratings.batting}%`, backgroundColor: Colors.primary }]} />
                </View>
                <Text style={styles.ratingValue}>{currentPlayer.ratings.batting}</Text>
              </View>
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>Bowling</Text>
                <View style={styles.ratingBarBg}>
                  <View style={[styles.ratingBar, { width: `${currentPlayer.ratings.bowling}%`, backgroundColor: Colors.secondary }]} />
                </View>
                <Text style={styles.ratingValue}>{currentPlayer.ratings.bowling}</Text>
              </View>
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>Fielding</Text>
                <View style={styles.ratingBarBg}>
                  <View style={[styles.ratingBar, { width: `${currentPlayer.ratings.fielding}%`, backgroundColor: Colors.accent }]} />
                </View>
                <Text style={styles.ratingValue}>{currentPlayer.ratings.fielding}</Text>
              </View>
            </View>
          </>
        )}

        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/create-match')}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${Colors.primary}20` }]}>
                <Trophy size={20} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Create Match</Text>
                <Text style={styles.menuSubtitle}>Set up a new cricket match</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: `${Colors.secondary}20` }]}>
                <User size={20} color={Colors.secondary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Manage Players</Text>
                <Text style={styles.menuSubtitle}>Add or edit player profiles</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: `${Colors.accent}20` }]}>
                <Award size={20} color={Colors.accent} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Tournaments</Text>
                <Text style={styles.menuSubtitle}>Create and manage tournaments</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  roleBadgeProfile: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.card,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ratingsSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingLabel: {
    width: 70,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ratingBarBg: {
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
    width: 30,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  adminSection: {
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.error}15`,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
});
