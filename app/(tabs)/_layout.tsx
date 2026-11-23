import { Tabs } from "expo-router";
import { Home, Trophy, Users, User, MoreHorizontal } from "lucide-react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { Hairline, Type } from "@/constants/tokens";

const TAB_BAR_CONTENT_HEIGHT = 64;

export default function TabLayout() {
  // Android draws edge-to-edge, so the tab bar must sit above the system
  // navigation buttons / gesture bar (and the iOS home indicator).
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: Hairline,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
        },
        tabBarLabelStyle: {
          ...Type.tag,
          fontWeight: '600',
          letterSpacing: 0,
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: "Teams",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
