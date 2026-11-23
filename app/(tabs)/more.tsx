import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Trophy, Users, Bell, BarChart3, FileText,
  HelpCircle, Mail, ChevronRight, Gamepad2, LucideIcon, MapPin
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Radius, Space, Touch, Type } from '@/constants/tokens';
import { useApp, useData } from '@/context/AppContext';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  subtitle: string;
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
        { icon: Gamepad2, label: 'Cricket', subtitle: 'Matches, stats, rankings', onPress: () => router.push('/matches') },
        { icon: Gamepad2, label: 'Football', subtitle: 'Coming soon', disabled: true },
        { icon: Gamepad2, label: 'Table Tennis', subtitle: 'Coming soon', disabled: true },
        { icon: Gamepad2, label: 'Badminton', subtitle: 'Coming soon', disabled: true },
      ],
    },
    {
      title: 'Features',
      items: [
        { icon: Trophy, label: 'Tournaments', subtitle: 'View all tournaments', onPress: () => { } },
        { icon: BarChart3, label: 'Leaderboards', subtitle: 'Top performers', onPress: () => { } },
        { icon: Bell, label: 'Notifications', subtitle: unreadCount > 0 ? `${unreadCount} unread` : 'All caught up', badge: unreadCount, onPress: () => router.push('../notification') },
      ],
    },
    {
      title: 'Help and support',
      items: [
        { icon: HelpCircle, label: 'FAQ', subtitle: 'Common questions', onPress: () => { } },
        { icon: Mail, label: 'Contact Support', subtitle: 'Get help', onPress: () => Linking.openURL('mailto:support@company.com') },
        { icon: FileText, label: 'Terms of Service', subtitle: 'Read our terms', onPress: () => { } },
      ],
    },
  ];

  if (isAdmin) {
    menuSections.splice(1, 0, {
      title: 'Admin tools',
      items: [
        { icon: Trophy, label: 'Manage Matches', subtitle: 'Create and edit matches', onPress: () => router.push('/cricket/create-match') },
        { icon: Users, label: 'Manage Teams', subtitle: 'Add teams and players', onPress: () => router.push('/teams') },
        { icon: MapPin, label: 'Manage Stadiums', subtitle: 'Add and edit grounds', onPress: () => router.push('/manage-stadiums') },
        { icon: Trophy, label: 'Champions', subtitle: 'Set winners and runners-up', onPress: () => router.push('/manage-awards') },
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
            <View style={styles.group}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
                  onPress={item.onPress}
                  disabled={item.disabled}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!item.disabled }}
                >
                  <item.icon size={20} color={Colors.textSecondary} />
                  <View style={[styles.menuContent, itemIndex > 0 && styles.menuContentRuled]}>
                    <View style={styles.menuText}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    {item.badge && item.badge > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>FAQ Sports v1.0.0</Text>
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
    paddingHorizontal: Space.xl,
    paddingTop: Space.md,
    paddingBottom: Space.sm,
  },
  title: {
    ...Type.largeTitle,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingBottom: 100,
  },
  section: {
    marginTop: Space.xxl,
  },
  sectionTitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
    marginBottom: Space.sm,
    paddingHorizontal: Space.lg,
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
  menuItemDisabled: {
    opacity: 0.4,
  },
  menuContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
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
  menuLabel: {
    ...Type.body,
    color: Colors.text,
  },
  menuSubtitle: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  badge: {
    minWidth: 22,
    alignItems: 'center',
    backgroundColor: Colors.live,
    paddingHorizontal: Space.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  badgeText: {
    ...Type.caption,
    fontVariant: ['tabular-nums'],
    color: Colors.textInverse,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: Space.xxl,
  },
  versionText: {
    ...Type.footnote,
    color: Colors.textMuted,
  },
});
