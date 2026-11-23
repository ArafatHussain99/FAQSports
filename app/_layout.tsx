import Colors from "@/constants/colors";
import { Hairline, Radius, Space, Type } from "@/constants/tokens";
import { AppProvider, DataProvider, useApp } from "@/context/AppContext";
import { CricketMatchProvider } from "@/sports/cricket/context";
import { FootballMatchProvider } from "@/sports/football/context";
import { TableTennisMatchProvider } from "@/sports/table-tennis/context";
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.surface },
        // Native hairline under the header. A custom headerBackground makes the
        // native-stack header overlay the screen, cutting off the top of content.
        headerShadowVisible: true,
        headerTintColor: Colors.text,
        headerTitleStyle: { color: Colors.ink, fontSize: Type.headline.fontSize, fontWeight: Type.headline.fontWeight },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="player/[id]" options={{ title: 'Player Profile' }} />
      <Stack.Screen name="team/[id]" options={{ title: 'Team Details' }} />
      <Stack.Screen name="manage-stadiums" options={{ title: 'Manage Stadiums' }} />
      <Stack.Screen name="manage-awards" options={{ title: 'Champions' }} />

      {/* Cricket */}
      <Stack.Screen name="cricket/create-match" options={{ title: 'Create Match', presentation: 'modal' }} />
      <Stack.Screen name="cricket/live-scoring" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="cricket/match/[id]" options={{ title: 'Match Details' }} />

      {/* Football */}
      <Stack.Screen name="football/create-match" options={{ title: 'Create Football Match', presentation: 'modal' }} />

      {/* Table Tennis */}
      <Stack.Screen name="table-tennis/create-match" options={{ title: 'Create Table Tennis Match', presentation: 'modal' }} />
      <Stack.Screen name="table-tennis/match/[id]" options={{ title: 'Table Tennis', gestureEnabled: false }} />
      <Stack.Screen name="notification" options={{ title: 'Notifications' }} />
    </Stack>
  );
}

function GlobalLoadingOverlay() {
  const { isGlobalLoading, globalLoadingMessage } = useApp();

  if (!isGlobalLoading) {
    return null;
  }

  return (
    <View style={styles.loadingOverlay} pointerEvents="box-none">
      <View style={styles.loadingCard} accessibilityRole="progressbar" accessibilityLabel={globalLoadingMessage}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{globalLoadingMessage}</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <DataProvider>
            <CricketMatchProvider>
              <FootballMatchProvider>
                <TableTennisMatchProvider>
                  <ActionSheetProvider>
                    <View style={{ flex: 1 }}>
                      <RootLayoutNav />
                      <GlobalLoadingOverlay />
                    </View>
                  </ActionSheetProvider>
                </TableTennisMatchProvider>
              </FootballMatchProvider>
            </CricketMatchProvider>
          </DataProvider>
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.scrim,
    zIndex: 999,
  },
  loadingCard: {
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    borderRadius: Radius.lg,
    borderWidth: Hairline,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    minWidth: 180,
  },
  loadingText: {
    ...Type.subhead,
    fontWeight: '600',
    marginTop: Space.md,
    color: Colors.text,
  },
});
