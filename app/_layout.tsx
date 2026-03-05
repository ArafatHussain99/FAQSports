import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, MatchProvider, DataProvider } from "@/context/AppContext";
import Colors from "@/constants/colors";
import { ActionSheetProvider } from '@expo/react-native-action-sheet';

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
      <Stack.Screen name="match/[id]" options={{ title: 'Match Details' }} />
      <Stack.Screen name="player/[id]" options={{ title: 'Player Profile' }} />
      <Stack.Screen name="team/[id]" options={{ title: 'Team Details' }} />
      <Stack.Screen name="create-match" options={{ title: 'Create Match', presentation: 'modal' }} />
      <Stack.Screen name="live-scoring" options={{ title: 'Live Scoring', headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    </Stack>
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
              <ActionSheetProvider>
                <RootLayoutNav />
              </ActionSheetProvider>
            </MatchProvider>
          </DataProvider>
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
