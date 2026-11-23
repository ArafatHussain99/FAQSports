import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, LogOut, ChevronRight, Trophy, Award, Settings } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
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

  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  const stats = currentPlayer
    ? [
      { label: 'Matches', value: currentPlayer.stats.matches },
      { label: 'Runs', value: currentPlayer.stats.runs },
      { label: 'Wickets', value: currentPlayer.stats.wickets },
      { label: 'Rating', value: currentPlayer.ratings.overall },
    ]
    : [];

  const ratings = currentPlayer
    ? [
      { label: 'Batting', value: currentPlayer.ratings.batting },
      { label: 'Bowling', value: currentPlayer.ratings.bowling },
      { label: 'Fielding', value: currentPlayer.ratings.fielding },
    ]
    : [];

  const adminActions = [
    { icon: Trophy, title: 'Create Match', subtitle: 'Set up a new cricket match', onPress: () => router.push('/cricket/create-match') },
    { icon: User, title: 'Manage Players', subtitle: 'Add or edit player profiles', onPress: undefined },
    { icon: Award, title: 'Tournaments', subtitle: 'Create and manage tournaments', onPress: undefined },
  ];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.profileName} numberOfLines={2}>{userName}</Text>
            <View style={[styles.roleTag, { backgroundColor: isAdmin ? Colors.adminBadge : Colors.playerBadge }]}>
              <Text style={styles.roleTagText}>{isAdmin ? 'ADMINISTRATOR' : 'PLAYER'}</Text>
            </View>
          </View>
        </View>

        {!isAdmin && currentPlayer && (
          <>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <View
                  key={stat.label}
                  style={[
                    styles.statCell,
                    index % 2 === 1 && styles.statCellRight,
                    index >= 2 && styles.statCellBottom,
                  ]}
                >
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Skill ratings</Text>
            <View style={styles.card}>
              {ratings.map((rating) => (
                <View key={rating.label} style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>{rating.label}</Text>
                  <View style={styles.ratingTrack}>
                    <View style={[styles.ratingBar, { width: `${rating.value}%` }]} />
                  </View>
                  <Text style={styles.ratingValue}>{rating.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Admin actions</Text>
            <View style={styles.group}>
              {adminActions.map((action, index) => (
                <TouchableOpacity
                  key={action.title}
                  style={styles.menuItem}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <action.icon size={20} color={Colors.textSecondary} />
                  <View style={[styles.menuContent, index > 0 && styles.menuContentRuled]}>
                    <View style={styles.menuText}>
                      <Text style={styles.menuTitle}>{action.title}</Text>
                      <Text style={styles.menuSubtitle}>{action.subtitle}</Text>
                    </View>
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
        >
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
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    marginRight: -Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingBottom: 100,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    paddingVertical: Space.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Type.title,
    color: Colors.ink,
  },
  identityText: {
    flex: 1,
    alignItems: 'flex-start',
    gap: Space.xs + 2,
  },
  profileName: {
    ...Type.title,
    color: Colors.text,
  },
  roleTag: {
    borderRadius: Radius.sm,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 2,
  },
  roleTagText: {
    ...Type.tag,
    color: Colors.ink,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginTop: Space.md,
    overflow: 'hidden',
  },
  statCell: {
    width: '50%',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  statCellRight: {
    borderLeftWidth: Hairline,
    borderLeftColor: Colors.border,
  },
  statCellBottom: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  statValue: {
    ...Type.scoreL,
    color: Colors.text,
  },
  statLabel: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    ...Type.title,
    color: Colors.text,
    marginTop: Space.section,
    marginBottom: Space.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  ratingLabel: {
    ...Type.subhead,
    width: 72,
    color: Colors.textSecondary,
  },
  ratingTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    marginHorizontal: Space.md,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    backgroundColor: Colors.ink,
  },
  ratingValue: {
    ...Type.number,
    width: 32,
    color: Colors.text,
    textAlign: 'right',
  },
  group: {
    backgroundColor: Colors.card,
    borderWidth: Hairline,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Space.lg,
    gap: Space.md,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Touch,
    paddingVertical: Space.sm,
    paddingRight: Space.md,
  },
  menuContentRuled: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    ...Type.body,
    color: Colors.text,
  },
  menuSubtitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    minHeight: Touch,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: Radius.md,
    marginTop: Space.section,
  },
  logoutText: {
    ...Type.headline,
    color: Colors.error,
  },
});
