import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Bell, Trophy, Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Hairline, Space, Touch, Type } from '@/constants/tokens';
import { useData } from '@/context/AppContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, markNotificationRead } = useData();

  const handleNotificationPress = (notification: typeof notifications[0]) => {
    markNotificationRead(notification.id);
    if (notification.matchId) {
      router.push(`/cricket/match/${notification.matchId}`);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <Trophy size={20} color={Colors.textSecondary} />;
      case 'tournament':
        return <Calendar size={20} color={Colors.textSecondary} />;
      default:
        return <Bell size={20} color={Colors.textSecondary} />;
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={22} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You&apos;re all caught up. Match results, live score updates and tournament
              news will show up here, and tapping one opens its match.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[styles.row, !notification.isRead && styles.rowUnread]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${notification.isRead ? '' : 'Unread. '}${notification.title}. ${notification.message}`}
              >
                <View style={styles.iconContainer}>
                  {getIcon(notification.type)}
                </View>
                <View style={styles.content}>
                  <Text style={[styles.title, !notification.isRead && styles.titleUnread]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
                </View>
                <View style={styles.dotSlot}>
                  {!notification.isRead && <View style={styles.unreadDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Space.xxxl,
  },
  emptyState: {
    alignItems: 'flex-start',
    gap: Space.sm,
    paddingHorizontal: Space.xl,
    paddingTop: Space.section * 2,
  },
  emptyTitle: {
    ...Type.title,
    color: Colors.text,
  },
  emptySubtitle: {
    ...Type.body,
    color: Colors.textSecondary,
  },
  list: {
    borderTopWidth: Hairline,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
    minHeight: Touch,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    borderBottomWidth: Hairline,
    borderBottomColor: Colors.border,
  },
  rowUnread: {
    backgroundColor: Colors.highlightSoft,
  },
  iconContainer: {
    width: 22,
    paddingTop: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: Space.xxs,
  },
  title: {
    ...Type.body,
    color: Colors.text,
  },
  titleUnread: {
    ...Type.bodyStrong,
  },
  message: {
    ...Type.subhead,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  time: {
    ...Type.footnote,
    color: Colors.textSecondary,
  },
  dotSlot: {
    width: 8,
    paddingTop: Space.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
  },
});
