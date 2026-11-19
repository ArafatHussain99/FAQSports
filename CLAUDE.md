# CLAUDE.md

Guidance for Claude Code when working in this repository.

## 1. Project Overview

- **Project name:** FAQ Sports
- **Purpose:** Stores player data, manages scores and acts as a sports activity management tool. Each sport's scorecard can be managed in the app.
- **Sports:** Cricket, Football, Table Tennis, Badminton, Carrom and UNO.
  - Cricket, Football and Table Tennis are implemented.
  - Badminton, Carrom and UNO appear on the home screen but show a "Coming Soon" alert (`app/(tabs)/index.tsx`).
- **Target users:** Employees of FAQ.
- **Current status:** Existing application under active development.

Read `docs/PROJECT_OVERVIEW.md` for details (if present).

## 2. Technology Stack

- **Frontend:** React Native 0.81 + React 19 via **Expo SDK 54**, with **Expo Router** (file-based routing). Runs on iOS, Android and web (`react-native-web`).
- **Language:** **TypeScript** (`strict: true`). Write new code as `.ts` / `.tsx`.
- **Backend / Database / Auth:** **Supabase** (`@supabase/supabase-js`).
- **State management:** React built-in hooks wrapped in context providers via `@nkzw/create-context-hook`, plus **TanStack React Query** for async data and `AsyncStorage` for persisted local settings. (`zustand` is installed but not used.)
- **Styling:** Component-based styling with `StyleSheet.create` at the bottom of each file, using shared color tokens from `constants/colors.tsx` (dark theme).
- **Icons:** `lucide-react-native` (primary), `@expo/vector-icons`.
- **Testing:** Jest with `jest-expo` preset + `@testing-library/react-native`.

## 3. Commands

```bash
npm install          # install dependencies (bun.lock also exists; npm is the documented default)
npm start            # expo start
npm run android      # expo start --android
npm run ios          # expo start --ios
npm run web          # expo start --web
npm run lint         # expo lint (eslint-config-expo)
npm test             # jest --watchAll
npx jest __tests__/home-screen-test.tsx   # run a single test once
npx tsc --noEmit     # type-check
```

Do **not** run `npm run reset-project` — it moves the `app/` directory out and replaces it with a blank starter.

## 4. Environment

Supabase credentials come from Expo public env vars (in `.env`, which is git-ignored):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Never commit `.env` or hard-code keys. Note: `app/api/supabaseClient.ts` currently `console.log`s both values — don't add more logging of secrets.

## 5. Project Structure

```
app/                          Expo Router routes (every file here is a route)
  _layout.tsx                 Root Stack + provider tree + global loading overlay
  (tabs)/                     Bottom tabs: index (Home), matches, teams, profile, more
  login.tsx                   Supabase email/password sign-in & sign-up
  create-match.tsx            Create cricket match
  create-football-match.tsx   Create football match
  create-table-tennis-match.tsx
  manage-stadiums.tsx         Grounds/stadium management
  match/[id].tsx              Match details
  match/(live_scoring)/
    live-scoring.tsx          Cricket live-scoring screen
    engines/                  Pure-ish cricket scoring logic
      scoreEngine.ts          runs, extras (wide/no-ball/bye/leg-bye), haptics
      wicketEngine.ts         dismissals
      inningsEngine.ts        innings transitions / match end
  player/[id].tsx, team/[id].tsx, notification.tsx
  api/                        Supabase data-access layer
    supabaseClient.ts         single shared Supabase client
    matchesApi.ts             auth (signUp/signIn/signOut/getUserRole), matches,
                              ball_info, teams, players, player_stats, grounds
    playerApi.ts, teamApi.ts  player/team insert & delete
components/                   Shared UI (MatchCard, LiveMatchCard)
constants/colors.tsx          Color tokens (incl. per-sport colors) — use these, not raw hex
constants/theme.ts            Expo template theme (mostly unused)
context/AppContext.tsx        AppProvider/useApp, DataProvider/useData,
                              MatchProvider/useMatches, FootballMatchProvider/useFootballMatches
types/                        Shared types (index.ts: SportType, UserRole, Player, Team,
                              CricketMatch, FootballMatch, BallEvent, ...; match/player/team.ts
                              hold Supabase row payload types)
mocks/data.ts                 Mock data still used by some screens/context
hooks/                        Color-scheme helpers
__tests__/                    Jest tests
```

Path alias: `@/*` maps to the repo root (e.g. `import Colors from '@/constants/colors'`).

## 6. Architecture Notes

- **Provider order** (in `app/_layout.tsx`): `QueryClientProvider` → `GestureHandlerRootView` → `AppProvider` → `DataProvider` → `MatchProvider` → `FootballMatchProvider` → `ActionSheetProvider`. New providers go in this tree.
- **New routes** must also be registered in the `<Stack>` in `app/_layout.tsx` if they need custom header/presentation options.
- **Data access:** screens should call functions in `app/api/*` (or the context hooks), never `supabase` directly. API functions log the error and `throw` it; callers handle it (usually via `Alert`).
- **Supabase tables in use:** `profiles`, `matches`, `ball_info`, `teams`, `players`, `player_stats`, `grounds`.
- **Auth & roles:** sign in via Supabase Auth, then `getUserRole` reads `profiles` to get `'admin' | 'player'`. Role, user name and current sport are persisted in `AsyncStorage` through `useApp()`.
- **Global loading:** wrap async work with `runWithGlobalLoading(fn, message)` from `useApp()` to show the overlay.
- **Sport switching:** `currentSport` (`SportType`) from `useApp()` drives which stats/screens are shown. When adding a sport, update `SportType` in `types/index.ts`, the sports list and switch statements in `app/(tabs)/index.tsx`, colors in `constants/colors.tsx`, and add create/scoring screens.
- **Cricket scoring:** keep scoring rules in `app/match/(live_scoring)/engines/*`; the screen passes state setters in via params objects (`ScoreEngineParams`, etc.). Ball events are uploaded with `uploadBallInfo`.
- **Mock data migration:** parts of the app still read from `mocks/data.ts` (e.g. matches/notifications in `AppContext`, grounds in create-football/TT screens). Prefer replacing mocks with Supabase-backed data when touching those areas.

## 7. Conventions

- Functional components + hooks only; default-export screen components.
- Styles via `StyleSheet.create` in the same file; colors from `Colors`.
- Use `SafeAreaView` from `react-native-safe-area-context`.
- Guard native-only APIs (e.g. haptics) with `Platform.OS !== 'web'`.
- Keep types in `types/` and import with `@/types`.
- Run `npm run lint` and `npx tsc --noEmit` before finishing a change.
