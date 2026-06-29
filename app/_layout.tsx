import Colors from "@/constants/colors";
import { AppProvider, DataProvider, FootballMatchProvider, MatchProvider, useApp } from "@/context/AppContext";
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
        headerTintColor: Colors.text,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="match/(live_scoring)/live-scoring" options={{ headerShown: false, }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Match Details' }} />
      <Stack.Screen name="player/[id]" options={{ title: 'Player Profile' }} />
      <Stack.Screen name="team/[id]" options={{ title: 'Team Details' }} />
      <Stack.Screen name="create-match" options={{ title: 'Create Match', presentation: 'modal' }} />
      <Stack.Screen name="live-scoring" options={{ title: 'Live Scoring', headerShown: false }} />
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
      <View style={styles.loadingCard}>
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
            <MatchProvider>
              <FootballMatchProvider>
                <ActionSheetProvider>
                  <View style={{ flex: 1 }}>
                    <RootLayoutNav />
                    <GlobalLoadingOverlay />
                  </View>
                </ActionSheetProvider>
              </FootballMatchProvider>
            </MatchProvider>
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
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 999,
  },
  loadingCard: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    minWidth: 180,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
