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

Read `docs/PROJECT_OVERVIEW.md` for details: roles, screens, sport status, cricket scoring rules, data model and known gaps.

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

Supabase project ID: `gflkukmbxjiggvobvitb` (URL `https://gflkukmbxjiggvobvitb.supabase.co`). `api/supabaseClient.ts` uses this URL by default.

The client key comes from an Expo public env var in `.env` (git-ignored) at the project root. Copy `.env.example` to start:

```
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # Supabase → Project Settings → API Keys
EXPO_PUBLIC_SUPABASE_URL=...                              # optional, overrides the default project URL
```

The legacy `EXPO_PUBLIC_SUPABASE_ANON_KEY` (JWT) is still read as a fallback while Supabase phases it out. Never commit `.env`, never hard-code or log the key, and never put a secret/service_role key in the app. `supabaseClient.ts` throws a clear error if no key is set. Expo inlines `EXPO_PUBLIC_*` values at bundle time, so restart with `npx expo start -c` after changing `.env`. Git worktrees under `.claude/worktrees/` don't have the `.env`; run the app from the main checkout.

## 5. Project Structure

Code is split into **shared** code and **per-sport** folders under `sports/`. `app/` holds routes only.

```
app/                          Expo Router routes ONLY (every file here becomes a URL)
  _layout.tsx                 Root Stack + provider tree + global loading overlay
  (tabs)/                     Bottom tabs: index (Home), matches, teams, profile, more
  login.tsx, manage-stadiums.tsx, notification.tsx
  player/[id].tsx, team/[id].tsx
  cricket/                    Thin route files that re-export screens from sports/cricket
    create-match.tsx          -> /cricket/create-match
    live-scoring.tsx          -> /cricket/live-scoring
    match/[id].tsx            -> /cricket/match/:id
  football/create-match.tsx   -> /football/create-match
  table-tennis/create-match.tsx -> /table-tennis/create-match

sports/                       Everything specific to one sport lives in its folder
  cricket/
    screens/                  CreateMatchScreen, LiveScoringScreen, MatchDetailsScreen
    components/               MatchCard, LiveMatchCard
    engines/                  Scoring logic, kept out of the screen
      scoreEngine.ts          runs, extras (wide/no-ball/bye/leg-bye), undo, haptics
      wicketEngine.ts         dismissals
      inningsEngine.ts        strike rotation, new bowler, innings change, match end
    api.ts                    getMatches, uploadBallInfo (`matches`, `ball_info` tables)
    context.tsx               CricketMatchProvider / useCricketMatches
    constants.ts              matchTypes (long / short pitch)
    types.ts                  CricketMatch, CricketInnings, BallEvent, ... + TypeBallInfo
  football/
    screens/CreateMatchScreen.tsx
    context.tsx               FootballMatchProvider / useFootballMatches
    types.ts                  FootballMatch, FootballEvent, ...
  table-tennis/
    screens/CreateMatchScreen.tsx

api/                          Shared Supabase data access (not sport-specific)
  supabaseClient.ts           single shared Supabase client
  authApi.ts                  signUp, signIn, signOut, getCurrentUser, getUserRole
  teamApi.ts                  getTeams, uploadTeamInfo, deleteTeamInfo
  playerApi.ts                getPlayers, getTeamPlayers, uploadPlayerInfo, uploadPlayerStats, deletePlayerInfo
  groundApi.ts                getGrounds, addGround
context/AppContext.tsx        AppProvider/useApp (role, user, current sport, global loading),
                              DataProvider/useData (players, teams, grounds, notifications)
types/                        Shared types: index.ts (SportType, UserRole, MatchStatus, Player,
                              Team, Tournament, Notification, ...); player.ts / team.ts hold
                              Supabase row payload types
constants/colors.tsx          Color tokens (incl. per-sport colors). Use these, not raw hex
constants/theme.ts            Expo template theme (mostly unused)
mocks/data.ts                 Mock data still used by some screens/context
hooks/                        Color-scheme helpers
__tests__/                    Jest tests
```

Path alias: `@/*` maps to the repo root (e.g. `import Colors from '@/constants/colors'`). Inside a sport folder, use relative imports (`../types`, `../context`); from outside, import via `@/sports/<sport>/...`.

**Where does new code go?**
- Used by one sport only → `sports/<sport>/` (screens, components, engines, api, context, types).
- Used by several sports or none (auth, teams, players, grounds) → `api/`, `context/`, `types/`, `constants/`.
- A new screen → write it in `sports/<sport>/screens/`, then add a one-line route file in `app/<sport>/` (`export { default } from '@/sports/<sport>/screens/XScreen';`) and register it in the `<Stack>` in `app/_layout.tsx`.
- Never put non-route files (helpers, API, engines) under `app/`: Expo Router treats them as routes.

## 6. Architecture Notes

- **Provider order** (in `app/_layout.tsx`): `QueryClientProvider` → `GestureHandlerRootView` → `AppProvider` → `DataProvider` → `CricketMatchProvider` → `FootballMatchProvider` → `ActionSheetProvider`. A new sport's provider goes in this tree.
- **New routes** must also be registered in the `<Stack>` in `app/_layout.tsx` if they need custom header/presentation options.
- **Data access:** screens should call functions in `api/*` or `sports/<sport>/api.ts` (or the context hooks), never `supabase` directly. API functions log the error and `throw` it; callers handle it (usually via `Alert`).
- **Supabase tables in use:** `profiles`, `matches`, `ball_info`, `teams`, `players`, `player_stats`, `grounds`.
- **Auth & roles:** sign in via Supabase Auth, then `getUserRole` reads `profiles` to get `'admin' | 'player'`. Role, user name and current sport are persisted in `AsyncStorage` through `useApp()`.
- **Global loading:** wrap async work with `runWithGlobalLoading(fn, message)` from `useApp()` to show the overlay.
- **Sport switching:** `currentSport` (`SportType`) from `useApp()` drives which stats/screens are shown.
- **Adding a sport** (e.g. badminton): create `sports/badminton/` following the cricket layout, add route files under `app/badminton/` and register them in `app/_layout.tsx`, update `SportType` in `types/index.ts`, the sports list and switch statements in `app/(tabs)/index.tsx` and `app/(tabs)/more.tsx`, and colors in `constants/colors.tsx`.
- **Cricket scoring:** keep scoring rules in `sports/cricket/engines/*`; the screen passes state setters in via params objects (`ScoreEngineParams`, etc.). Ball events are uploaded with `uploadBallInfo` from `sports/cricket/api.ts`.
- **Mock data migration:** parts of the app still read from `mocks/data.ts` (cricket matches in `sports/cricket/context.tsx`, notifications in `AppContext`, grounds in the football and table tennis create screens). Prefer replacing mocks with Supabase-backed data when touching those areas.

## 7. Conventions

- Functional components + hooks only; default-export screen components.
- Styles via `StyleSheet.create` in the same file; colors from `Colors`.
- Use `SafeAreaView` from `react-native-safe-area-context`.
- Guard native-only APIs (e.g. haptics) with `Platform.OS !== 'web'`.
- Shared types go in `types/` (import with `@/types`); sport-specific types go in `sports/<sport>/types.ts`.
- Run `npm run lint` and `npx tsc --noEmit` before finishing a change.
