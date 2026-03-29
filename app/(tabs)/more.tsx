import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Trophy, Users, Bell, BarChart3, FileText,
  HelpCircle, Mail, ChevronRight, Gamepad2, LucideIcon
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp, useData } from '@/context/AppContext';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  subtitle: string;
  color: string;
  onPress?: () => void;
  disabled?: boolean;
  badge?: number;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const router = useRouter();
  const { isAdmin } = useApp();
  const { unreadCount } = useData();

  const menuSections: MenuSection[] = [
    {
      title: 'Sports',
      items: [
        { icon: Gamepad2, label: 'Cricket', subtitle: 'Matches, stats, rankings', color: Colors.cricket, onPress: () => router.push('/matches') },
        { icon: Gamepad2, label: 'Football', subtitle: 'Coming soon', color: Colors.football, disabled: true },
        { icon: Gamepad2, label: 'Table Tennis', subtitle: 'Coming soon', color: Colors.tableTennis, disabled: true },
        { icon: Gamepad2, label: 'Badminton', subtitle: 'Coming soon', color: Colors.badminton, disabled: true },
      ],
    },
    {
      title: 'Features',
      items: [
        { icon: Trophy, label: 'Tournaments', subtitle: 'View all tournaments', color: Colors.primary, onPress: () => { } },
        { icon: BarChart3, label: 'Leaderboards', subtitle: 'Top performers', color: Colors.secondary, onPress: () => { } },
        { icon: Bell, label: 'Notifications', subtitle: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up', color: Colors.accent, badge: unreadCount, onPress: () => router.push('../notification') },
      ],
    },
    {
      title: 'Help & Support',
      items: [
        { icon: HelpCircle, label: 'FAQ', subtitle: 'Common questions', color: Colors.info, onPress: () => { } },
        { icon: Mail, label: 'Contact Support', subtitle: 'Get help', color: Colors.cricket, onPress: () => Linking.openURL('mailto:support@company.com') },
        { icon: FileText, label: 'Terms of Service', subtitle: 'Read our terms', color: Colors.textMuted, onPress: () => { } },
      ],
    },
  ];

  if (isAdmin) {
    menuSections.splice(1, 0, {
      title: 'Admin Tools',
      items: [
        { icon: Trophy, label: 'Manage Matches', subtitle: 'Create and edit matches', color: Colors.adminBadge, onPress: () => router.push('/create-match') },
        { icon: Users, label: 'Manage Teams', subtitle: 'Add teams and players', color: Colors.primary, onPress: () => router.push('/teams') },
      ],
    });
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.title}>More</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuContainer}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
                  onPress={item.onPress}
                  disabled={item.disabled}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                    <item.icon size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuLabel, item.disabled && styles.menuLabelDisabled]}>
                      {item.label}
                    </Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.badge && item.badge > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  ) : (
                    <ChevronRight size={18} color={Colors.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Company Sports Portal v1.0.0</Text>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  menuLabelDisabled: {
    color: Colors.textMuted,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  badge: {
    backgroundColor: Colors.live,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
