# FAQ Sports — Project Audit

**Audit date:** 2026-11-19
**Commit audited:** `1f86ac9` (branch `master` at the time of audit)
**Scope:** the whole repository (77 tracked files, ~12k lines of app code excluding lock files and assets).
**Method:** read every source file; ran `tsc --noEmit`, `eslint` and `jest` (results in §12). No application source code was changed.

> **Update 2026-11-19:** the real Supabase schema has since been supplied. Schema facts in §7–§8 and §15 are superseded by [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) and [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

Anything that cannot be decided from the code is marked **Unknown**. The Supabase database (tables, columns, RLS policies, triggers) is not in this repository, so most backend facts are inferred from client code and are marked as such.

---

## Contents

1. [Summary](#1-summary)
2. [Technology stack and dependencies](#2-technology-stack-and-dependencies)
3. [Architecture](#3-architecture)
4. [Screens and navigation](#4-screens-and-navigation)
5. [Reusable components](#5-reusable-components)
6. [State management](#6-state-management)
7. [API integrations and backend services](#7-api-integrations-and-backend-services)
8. [Database schema and relationships](#8-database-schema-and-relationships)
9. [Authentication and authorization](#9-authentication-and-authorization)
10. [Business logic](#10-business-logic)
11. [Error handling and validation](#11-error-handling-and-validation)
12. [Tests and build processes](#12-tests-and-build-processes)
13. [Technical debt and problems](#13-technical-debt-and-problems)
14. [Existing functionality that must not break](#14-existing-functionality-that-must-not-break)
15. [Unknowns](#15-unknowns)
16. [Suggested priorities](#16-suggested-priorities)

---

## 1. Summary

FAQ Sports is an Expo (React Native) app that runs on iOS, Android and web, with Supabase as the backend. Cricket is the most complete sport. Football and Table Tennis only have "create match" screens, and Badminton, Carrom and UNO are placeholders.

**What is backed by Supabase today:** sign-in/sign-up, user role lookup, teams (read, create, delete), players (read, create), player stats (create a zeroed row), grounds (read, create).

**What is not persisted (in memory or mock data only):** all matches for every sport, live scoring and ball-by-ball data, notifications, player comments, ratings, last-five performances, stadium deletion, and player team changes.

**Most important findings:**

| # | Finding | Severity | Where |
|---|---------|----------|-------|
| 1 | ~~`deletePlayerInfo` deletes from the **`teams`** table using a player ID.~~ **Fixed 2026-11-23:** deletes from `players` and throws when 0 rows are deleted. | Critical (data integrity) | `api/playerApi.ts` |
| 2 | Authorization exists only in the client. The role lives in AsyncStorage/localStorage, admin screens have no route guard, and server-side RLS is **Unknown**. | Critical (security), pending RLS check | §9 |
| 3 | The Supabase client is created without a storage adapter, so on iOS/Android the auth session is probably not persisted. After a restart the app still treats the user as signed in (role cached), but requests go out as anonymous. | High | `api/supabaseClient.ts:24` |
| 4 | Cricket matches and balls are never saved. `uploadBallInfo` and `getMatches` are never called; matches live in React state seeded from mocks and are lost on reload. | High (contradicts docs) | `sports/cricket/*` |
| 5 | Undo in live scoring only removes the ball from the on-screen "This Over" strip. Score, batsman and bowler figures are not reverted. | High (scoring correctness) | `sports/cricket/engines/scoreEngine.ts:224` |
| 6 | Several cricket rule bugs: byes/leg-byes don't count as legal deliveries, byes/leg-byes are charged to the bowler, the win margin in wickets is wrong, ties go to team B (or team A on manual end), a wicket on the last ball of the innings doesn't end it, and Hit Wicket is missing from the menu. | High | §10.2 |
| 7 | ~~Team delete runs `deleteTeamInfo` twice without awaiting or catching errors, and always shows "deleted successfully".~~ **Fixed 2026-11-23:** one awaited call, error alert, success only after the delete is confirmed. | Medium | `app/(tabs)/teams.tsx` |
| 8 | The "Change Team" modal for players does nothing (`onPress={() => editingPlayer}`). | Medium | `app/(tabs)/teams.tsx:561,585` |
| 9 | `Alert.alert` with buttons is a no-op on react-native-web, so on web every confirm flow (create/start match, delete, logout, innings change, wicket follow-ups) silently does nothing. | High on web | many files |
| 10 | The only test cannot run: `supabaseClient.ts` throws without env vars, and the assertion (`'Welcome!'`) doesn't match the screen (`Hello, {userName}!`). | Medium | `__tests__/home-screen-test.tsx` |

---

## 2. Technology stack and dependencies

### 2.1 Core stack

| Area | Choice | Version (`package.json`) |
|------|--------|--------------------------|
| Framework | Expo SDK | `~54.0.27` (installed 54.0.35) |
| UI runtime | React Native / React | `0.81.5` / `19.1.0` |
| Web | react-native-web, react-dom | `^0.21.0`, `19.1.0` |
| Routing | Expo Router (file-based), typed routes on | `~6.0.17` |
| Language | TypeScript, `strict: true` | `~5.9.2` |
| Backend | `@supabase/supabase-js` | `^2.99.0` |
| Async state | `@tanstack/react-query` | `^5.83.0` |
| Context helper | `@nkzw/create-context-hook` | `^1.1.0` |
| Persistence | `@react-native-async-storage/async-storage` | `2.2.0` |
| Action sheets | `@expo/react-native-action-sheet` | `^4.1.1` |
| Icons | `lucide-react-native` | `^0.577.0` |
| Haptics | `expo-haptics` | `~15.0.8` |
| Lint | ESLint 9 + `eslint-config-expo` (flat config) | |
| Tests | Jest 29 + `jest-expo` + `@testing-library/react-native` 14 | |

`app.json` experiments: `typedRoutes: true`, `reactCompiler: true`, and `newArchEnabled: true`.

### 2.2 Dependency hygiene

| Issue | Detail |
|-------|--------|
| Packages that look accidental in `dependencies` | `install`, `npx` (these are CLI tools, not libraries). |
| Test tools listed twice | `jest` and `jest-expo` are in both `dependencies` and `devDependencies`. `react-test-renderer` is in `dependencies`. |
| Installed but never imported | `zustand`, `expo-image-picker`, `expo-location`, `expo-blur`, `expo-linear-gradient`, `expo-image`, `expo-symbols`, `expo-web-browser`, `@stardazed/streams-text-encoding`, `@ungap/structured-clone`, `@expo/vector-icons` (CLAUDE.md lists it as an icon library, but it isn't used). Some Expo packages (`expo-constants`, `expo-linking`, `expo-font`, `expo-system-ui`, `react-native-svg` as a lucide peer, `react-native-worklets`) may be required as peers or by Expo Router. Check `npx expo install --check` before removing anything. |
| Two lock files | `package-lock.json` and `bun.lock`. CLAUDE.md names npm as the default. The two can drift. |
| `@expo/ngrok` | Dev dependency for `expo start --tunnel`. Fine, but unused by scripts. |
| No `@types/node` | `process.env` only type-checks because `expo-env.d.ts` (git-ignored, generated by `expo start`) references `expo/types`. A fresh clone fails `tsc` until Expo has run once (see §12). |

---

## 3. Architecture

### 3.1 Folder layout

```
app/           Expo Router routes only (tabs, login, details, per-sport route stubs)
sports/<sport> screens, components, engines, api, context, types per sport
api/           shared Supabase data access (auth, teams, players, grounds)
context/       AppContext.tsx: AppProvider/useApp + DataProvider/useData
types/         shared domain types + Supabase row payload types
constants/     colors.tsx (used), theme.ts (Expo template, unused)
hooks/         Expo template color-scheme hooks (unused by app code)
mocks/data.ts  1,188 lines of mock players, teams, matches, notifications, tournaments, grounds
scripts/       reset-project.js (Expo template; destructive — do not run)
```

Route files under `app/cricket`, `app/football` and `app/table-tennis` are one-line re-exports of screens in `sports/`. This matches the guidance in CLAUDE.md.

### 3.2 Provider tree (`app/_layout.tsx`)

```
QueryClientProvider
└─ GestureHandlerRootView
   └─ AppProvider            (role, user name, current sport, global loading)
      └─ DataProvider        (players, teams, grounds, notifications)
         └─ CricketMatchProvider   (live/upcoming/completed cricket matches — in memory)
            └─ FootballMatchProvider (same for football — in memory, starts empty)
               └─ ActionSheetProvider
                  └─ Stack + GlobalLoadingOverlay
```

### 3.3 Data flow

- Screens read state from context hooks (`useApp`, `useData`, `useCricketMatches`, `useFootballMatches`).
- Writes go through functions in `api/*`, followed by a React Query `refetch` (teams/players) or a direct local state update (grounds).
- Cricket live scoring: the screen builds params objects and calls pure-ish functions in `sports/cricket/engines/*`. Those functions mutate copies of match state and call `updateLiveMatch`/`setLiveMatch`. User prompts go through `showActionSheetWithOptions` and `Alert.alert`, chained with `setTimeout(…, 300)`.
- No screen calls `supabase` directly. All Supabase access is in `api/` and `sports/cricket/api.ts`, as CLAUDE.md requires.

---

## 4. Screens and navigation

### 4.1 Route map

| Route | File | Presentation | Backed by | Notes |
|-------|------|--------------|-----------|-------|
| `/` (Home tab) | `app/(tabs)/index.tsx` | tab | context (mock cricket matches, Supabase players/teams) | Redirects to `/login` when no role is cached. Sport switcher. Live/upcoming/recent cards shown for cricket only. |
| `/matches` | `app/(tabs)/matches.tsx` | tab | cricket context only | Filters: all, live, upcoming, completed. Ignores the selected sport. Pull-to-refresh is fake (1 s timer). |
| `/teams` | `app/(tabs)/teams.tsx` | tab | Supabase via `useData` | Teams/Players sub-tabs; admin add team, add player, swipe-to-delete, change team (broken). |
| `/profile` | `app/(tabs)/profile.tsx` | tab | context | Stats of a player matched by name; admin shortcuts. "Manage Players", "Tournaments" and the Settings icon have no handlers. |
| `/more` | `app/(tabs)/more.tsx` | tab | static | Sports list, features, help, admin tools. Tournaments, Leaderboards, FAQ and Terms are empty handlers. Football/TT marked "Coming soon". |
| `/login` | `app/login.tsx` | fullScreenModal | Supabase Auth + `profiles` | Sign in / sign up toggle. |
| `/player/[id]` | `app/player/[id].tsx` | stack | `useData` | Stats, ratings (fixed at 50 for Supabase players), comments (local state only, lost on leave). |
| `/team/[id]` | `app/team/[id].tsx` | stack | `useData` | Squad, captain, top performers. |
| `/manage-stadiums` | `app/manage-stadiums.tsx` | stack | Supabase `grounds` | Add works. Delete only changes local state. |
| `/notification` | `app/notification.tsx` | stack | mock notifications | Mark-as-read is in memory only. Tapping a match notification goes to `/cricket/match/:id`. |
| `/cricket/create-match` | → `sports/cricket/screens/CreateMatchScreen.tsx` | modal | in memory | Four steps: basics → teams → toss → players. |
| `/cricket/live-scoring` | → `LiveScoringScreen.tsx` | stack, no header, no swipe-back | in memory | Ball-by-ball scoring. |
| `/cricket/match/[id]` | → `MatchDetailsScreen.tsx` | stack | in memory | Scorecard and info tabs. Commentary tab type exists but isn't rendered. |
| `/football/create-match` | → `sports/football/screens/CreateMatchScreen.tsx` | modal | in memory | "Start Now" sets the current match and goes back. No live screen exists. |
| `/table-tennis/create-match` | → `sports/table-tennis/screens/CreateMatchScreen.tsx` | modal | nothing | Both "Save" and "Start" just go back. Nothing is stored. |
| `+not-found` | `app/+not-found.tsx` | | | Generic 404. |
| `+native-intent` | `app/+native-intent.tsx` | | | Passes deep links through unchanged. |

### 4.2 Navigation observations

- **Login gate only on Home.** Only `app/(tabs)/index.tsx:33` redirects to `/login`. Every other route, including admin routes like `/cricket/create-match`, `/cricket/live-scoring` and `/manage-stadiums`, can be opened directly (deep link or web URL) with no role or session check.
- Relative push `router.push('../notification')` is used from the Home and More tabs. It works, but `'/notification'` would be clearer with typed routes.
- "Manage Matches" in More, "Create Match" in Profile and the "+" in Matches always open the **cricket** create screen, whatever sport is selected.
- Football matches created with "Save as Upcoming" are never listed anywhere. They only add to the Home "Matches" counter when Football is selected.

---

## 5. Reusable components

| Component | Location | Used by | Notes |
|-----------|----------|---------|-------|
| `MatchCard` | `sports/cricket/components/MatchCard.tsx` | Home, Matches | Cricket only. Pushes to `/cricket/match/:id`. |
| `LiveMatchCard` | `sports/cricket/components/LiveMatchCard.tsx` | Home, Matches | Cricket only. Shows runs needed in innings 2. |
| `SwipeableCard` | inline in `app/(tabs)/teams.tsx` | Teams | Built with `PanResponder` and `Animated`. The responder is created once in `useRef`, so `isAdmin` is captured at mount and can go stale. Uses `useNativeDriver: false`. |
| `GlobalLoadingOverlay` | inline in `app/_layout.tsx` | everything (via `runWithGlobalLoading`) | `pointerEvents="box-none"` means the overlay **does not block touches**, so users can double-submit while it is showing. |

**Missing shared components (duplicated across screens):**

- Player avatar initial circle (Home, Teams, Team details, Player profile, Match details).
- Rating bars (Profile and Player profile, near-identical markup).
- Stat cards and stat grids (Home, Profile, Team, Player).
- Team logo badge (Teams, Team details, Create Match ×3 screens, Match details).
- Multi-step wizard: progress dots, footer button, header close (Cricket, Football and TT create screens each implement their own).
- Selectable chip/list item (create screens, Teams modals).
- Empty state (Matches, Notifications, Manage Stadiums each style their own).
- Modal form shell (three modals in Teams).

---

## 6. State management

### 6.1 `AppProvider` / `useApp` (`context/AppContext.tsx`)

- State: `role`, `userName`, `currentSport`, `isInitialized`, `isOnline`, `isGlobalLoading`, `globalLoadingMessage`.
- Persisted in AsyncStorage: `user_role`, `user_name`, `current_sport`.
- Loaded with a React Query `useQuery(['init'])`, then copied into local state by `useEffect`.
- Writes go through `useMutation` (set role, set sport, logout).
- `isOnline` is never updated, because nothing calls `setIsOnline`. The "Offline" badge on Home therefore never shows.
- `logout` clears role and name from storage. It does **not** call `supabase.auth.signOut()`, does not clear the React Query cache, and does not reset `currentSport`.

### 6.2 `DataProvider` / `useData`

- `players` and `teams` start as **mock data** (`useState(mockPlayers)` at line 130). They are replaced when the Supabase query succeeds.
- When the fetch fails, the `queryFn` catches the error and returns mocks, but state is never reset, so the **mock data stays on screen and looks real**, with only a `console.error`.
- `queryFn`s call `setTeams`/`setPlayers` inside the query function. This duplicates React Query's cache into `useState`, so there are two sources of truth.
- `notifications` are mock only. `grounds` come from Supabase.
- `addPlayer`, `updatePlayer`, `deletePlayer`, `addTeam`, `updateTeam` and `deleteTeam` are local-only mutators. None of them is called by a screen today; screens call the API and refetch instead.
- `getTeamPlayers` has a needless `teams` dependency (lint warning).
- `refetchTeams` and `refetchPlayers` depend on the whole query object, so their identity changes every render.
- The provider value isn't memoized. Every consumer re-renders on any change. The experimental React Compiler may soften this; whether it does is **Unknown**.

### 6.3 `CricketMatchProvider` / `useCricketMatches` (`sports/cricket/context.tsx`)

- `liveMatch`, `upcomingMatches` and `completedMatches` are seeded from mocks. `currentMatch` starts as `null`.
- There are two "live" pointers. `currentMatch` drives the scoring screen, and `liveMatch` drives cards and details. `startMatch` sets both but is **never called**: Create Match and Match Details call `setCurrentMatch` directly, so `liveMatch` only appears after the first scored ball.
- Starting a match from "Upcoming" doesn't remove it from `upcomingMatches`, so it shows in both lists.
- Everything is lost on app reload.

### 6.4 `FootballMatchProvider`

A structural copy of the cricket provider with empty initial state. It is duplicated code that could become a generic match context.

### 6.5 Local and screen state

Forms use many `useState` hooks per screen (the cricket create screen has 16). There is no form library. The live-scoring "This Over" strip (`lastBalls`) is screen-local state, separate from `innings.thisOver`, which is never written.

---

## 7. API integrations and backend services

Supabase is the only external service. All functions log with `console.error` and re-throw, except where noted.

| Function | File | Table / service | Operation | Called from |
|----------|------|-----------------|-----------|-------------|
| `signUp` | `api/authApi.ts` | Supabase Auth | `auth.signUp` with `full_name` metadata | Login |
| `signIn` | `api/authApi.ts` | Supabase Auth | `auth.signInWithPassword` | Login |
| `signOut` | `api/authApi.ts` | Supabase Auth | `auth.signOut` | **never called** |
| `getCurrentUser` | `api/authApi.ts` | Supabase Auth | `auth.getUser` (returns `null` on error, doesn't throw) | **never called** |
| `getUserRole` | `api/authApi.ts` | `profiles` | `select role where email = ?` (returns `null` on error; `console.log`s the row) | Login |
| `getTeams` | `api/teamApi.ts` | `teams` | `select *` ordered by name | DataProvider |
| `uploadTeamInfo` | `api/teamApi.ts` | `teams` | insert | Teams |
| `deleteTeamInfo` | `api/teamApi.ts` | `teams` | delete by id | Teams |
| `getPlayers` | `api/playerApi.ts` | `players` | `select *` ordered by name | DataProvider |
| `getTeamPlayers` | `api/playerApi.ts` | `players` | `select * where team_id` | **never called** (the context version is used) |
| `uploadPlayerInfo` | `api/playerApi.ts` | `players` | insert, returns id | Teams |
| `uploadPlayerStats` | `api/playerApi.ts` | `player_stats` | insert | Teams |
| `deletePlayerInfo` | `api/playerApi.ts` | **`teams` (bug)** | delete by player id | Teams |
| `getGrounds` | `api/groundApi.ts` | `grounds` | `select name` | DataProvider, Manage Stadiums |
| `addGround` | `api/groundApi.ts` | `grounds` | insert name, location | Manage Stadiums |
| `getMatches` | `sports/cricket/api.ts` | `matches` | `select *` (logs `data.map(p => p.name)`) | **never called** (imported but unused in Match Details) |
| `uploadBallInfo` | `sports/cricket/api.ts` | `ball_info` | insert | **never called** |

**Observations**

- There are no update endpoints at all, so players and teams can't be edited (team change, captain, ratings).
- Player creation is two writes (`players` then `player_stats`) with no transaction. If the second fails, the player exists without a stats row.
- No pagination, filtering or column selection. Every list is `select *` of the full table.
- No realtime subscriptions, so live scores aren't shared between devices.
- Supabase client configuration (`api/supabaseClient.ts`):
  - no `auth.storage` (AsyncStorage) and no `detectSessionInUrl: false`, which React Native setups normally set;
  - whether `react-native-url-polyfill` is still needed with supabase-js 2.99 on RN 0.81 is **Unknown**. It isn't installed.
- The client **throws at import time** when no key is set. This is useful in dev, but it takes down the whole app and every test that imports any API module.

---

## 8. Database schema and relationships

**There are no migrations, SQL files, generated types (`supabase gen types`) or seed scripts in the repo.** The table below is inferred from client code only.

| Table | Columns referenced by the client | Inferred keys / relations |
|-------|---------------------------------|---------------------------|
| `profiles` | `email`, `role` (`'admin' \| 'player'`) | Probably 1:1 with `auth.users`. Whether rows are created by a trigger on sign-up is **Unknown**. |
| `teams` | `id`, `name`, `short_name`, `color`, `logo_url`, `captain_player_id` | `captain_player_id` → `players.id` (FK **Unknown**) |
| `players` | insert: `name`, `team_id`, `position`, `batting_style`, `bowling_style`; read via `select *`: `id`, plus stat columns `matches`, `runs`, `balls`, `wickets`, `catches`, `run_outs`, `stumpings`, `highest_score`, `best_bowling_wickets`, `fifties`, `centuries`, `batting_average`, `strike_rate`, `economy_rate`, `goals`, `assists`, `wins` | `team_id` → `teams.id` (FK and `ON DELETE` behaviour **Unknown**) |
| `player_stats` | `player_id`, the same stat columns as above, plus `best_bowling_runs` | `player_id` → `players.id` |
| `grounds` | `name`, `location` | none |
| `matches` | **Unknown** (only `select *`; the code logs a `name` column) | none |
| `ball_info` | `matchId` (number), `innings`, `over`, `ball`, `strikerId`, `bowlerId`, `runs`, `extra_type`, `wicket`, `wicket_type`, `commentary` | `matchId` → `matches.id` |

**Schema-level concerns**

- **Stats live in two places.** Stats are written to `player_stats`, but `getPlayers` reads stat columns from `players` with no join. Either `players` duplicates those columns, or it's a view, or the stats always read as `0`. Which one is **Unknown**. Either way it needs reconciling.
- **ID type mismatch.** `TypeBallInfo.matchId` is a `number`, but client match IDs are strings (`match_${Date.now()}`), and teams and players look like UUIDs.
- **Mixed naming.** `ball_info` mixes camelCase (`matchId`, `strikerId`) with snake_case (`extra_type`, `wicket_type`).
- The **Team delete** confirm text says "Players will remain … but will not be assigned to any team". That only holds if the FK is `ON DELETE SET NULL`, which is **Unknown**.
- Ratings, last-five performances, comments, notifications, tournaments and audit logs have TypeScript types (`types/index.ts`) but no table.
- **Mock IDs don't match Supabase IDs.** Mock matches reference mock team and player IDs (`t1`, `p1`, …). When Supabase data loads, the mock cricket matches show blank team names and player names.

---

## 9. Authentication and authorization

### 9.1 Flow

1. Home sees no cached role and redirects to `/login`.
2. Sign up: `supabase.auth.signUp(email, password, {full_name})`. The app then asks the user to sign in. Whether email confirmation is required is **Unknown** (Supabase project setting).
3. Sign in: `signInWithPassword(email.toLowerCase(), password.trim())`, then `getUserRole(email)` from `profiles`.
4. `setRole(role, emailLocalPart)` is saved to AsyncStorage, then `router.replace('/')`.
5. On later launches, only the cached AsyncStorage role is checked. The Supabase session is never checked (`getCurrentUser` is unused).

### 9.2 Security findings

| # | Issue | Impact |
|---|-------|--------|
| S1 | **Authorization is client-only.** `isAdmin` comes from AsyncStorage (on web, `localStorage`), which a user can edit. Admin-only UI is hidden by `isAdmin` checks, but admin routes have no guard. | Any user (or anyone with the publishable key) can do admin writes **unless RLS prevents it**. RLS is **Unknown**, and it is the only real protection. |
| S2 | **Session probably not persisted on native.** `createClient` has no `auth.storage`. On iOS/Android, supabase-js has no `localStorage`, so the session lives in memory only. After an app restart the role is still cached but requests run as `anon`. | Writes may fail or succeed as anonymous, depending on RLS. Inconsistent behaviour. Confirm on a device. |
| S3 | **Logout doesn't sign out of Supabase.** | The session token stays valid in the client until it expires. |
| S4 | **Role lookup by email.** `profiles` is queried by `email`, not by `auth.uid()`. | Needs `profiles` to be readable by email, which may expose other users' roles if RLS allows broad reads (**Unknown**). |
| S5 | **Open sign-up.** Any email can register. Nothing in the client limits sign-ups to FAQ employees. | Server-side restriction (domain allow-list, invite-only) is **Unknown**. |
| S6 | **Password is `.trim()`med** on sign-up and sign-in. | Passwords with leading or trailing spaces are silently changed. Low risk, but surprising. |
| S7 | **`console.log` of profile row** in `getUserRole`, and the matches log in `getMatches`. | Logs user data in production builds. |
| S8 | **Client key handling is correct.** It's read from `EXPO_PUBLIC_*` env vars, `.env` is git-ignored, and a scan of git history found no committed keys or service-role secrets. | OK. |
| S9 | **Injection / XSS.** All queries use the supabase-js query builder (parameterised). React Native `Text` escapes output. No `dangerouslySetInnerHTML`. | No issues found. |
| S10 | **Identity mapping.** The profile screen picks the "current player" by fuzzy name match against the email local part, and falls back to `players[0]`. | Users can see someone else's stats presented as their own. |

---

## 10. Business logic

### 10.1 Where it lives

| Logic | Location |
|-------|----------|
| Runs, extras, over completion, strike rotation, chase check, haptics | `sports/cricket/engines/scoreEngine.ts` |
| Dismissals, fielder pick, new batsman, new bowler | `sports/cricket/engines/wicketEngine.ts` |
| Opening players for innings 2, innings end, result, manual end, swap strike, new bowler (duplicate) | `sports/cricket/engines/inningsEngine.ts` |
| Match setup validation, toss, team reordering so team A always bats first | `sports/cricket/screens/CreateMatchScreen.tsx` |
| Sport-specific "top performer" stat | `app/(tabs)/index.tsx` (`getPlayerStat`) |
| Scorecard text (dismissal strings, did-not-bat) | `sports/cricket/screens/MatchDetailsScreen.tsx` |

### 10.2 Cricket scoring defects (verified by reading the code)

| # | Defect | Location |
|---|--------|----------|
| C1 | **Undo is cosmetic.** It only pops the last ball from `lastBalls`. Runs, balls, extras and player figures are unchanged. The prompt says "Max 2 balls can be undone", but there is no limit. | `scoreEngine.ts:215-226` |
| C2 | **Byes and leg-byes don't count as legal deliveries.** `isLegalBall = !extraType`, so the over never advances on byes or leg-byes. | `scoreEngine.ts:45` |
| C3 | **Byes and leg-byes are charged to the bowler.** The bowler's runs add `totalRuns` for every extra type. | `scoreEngine.ts:135` |
| C4 | **State is mutated in place.** The code makes shallow copies (`{...match}`, `{...innings}`) and then mutates nested objects (`innings.extras.*`, `updatedMatch.innings[i] = …`, `innings.batsmen[i] = …` in the wicket engine, `fallOfWickets.push`). The chase check at line 182 only works *because* `match.innings` was mutated through the shared array. | engines |
| C5 | **The end-of-over path runs before the ball's stats are applied.** `updateLiveMatch` and `handleInningsEnd` are called mid-function, and then the function continues and calls `updateLiveMatch` again. `handleInningsEnd` can fire twice if the last ball of the innings also wins the chase. | `scoreEngine.ts:68-95,182` |
| C6 | **A wicket on the final ball of the innings doesn't end it.** `continueWicketProcess` skips the new-bowler prompt, but then asks for a new batsman instead of calling `handleInningsEnd`. | `wicketEngine.ts:165-185` |
| C7 | **The chase isn't checked after a wicket ball.** Only relevant for run-outs with runs, which aren't supported anyway. | wicket engine |
| C8 | **Wrong win margin in wickets.** It uses `playingXI_A.length - wickets`. It should be the chasing side's `playingXI_B.length - 1 - wickets`. | `inningsEngine.ts:140` |
| C9 | **Ties are not handled.** An equal score after innings 2 declares team B the winner. Manual "End Match" with equal scores declares team A. | `inningsEngine.ts:135,228` |
| C10 | **Hit Wicket is not in the dismissal menu**, although the type and the bowler-credit logic support it. "Retired Hurt" doesn't add a wicket. That's correct, but it is shown as `dismissalType: 'retired'` and not marked out. | `wicketEngine.ts:264` |
| C11 | **The new-batsman list can include the current non-striker** if they haven't faced a ball yet (they aren't in `innings.batsmen`). | `wicketEngine.ts:193-198` |
| C12 | **Wicket balls are not recorded.** No `BallEvent` is created on a wicket, so wickets never appear in "This Over", `allBalls` or (future) `ball_info`. | wicket engine |
| C13 | **Maidens are never calculated.** `thisOver` is never filled. | engines |
| C14 | **"This Over" shows the last 6 events**, not the current over. Byes and leg-byes are labelled `Nb`. | `LiveScoringScreen.tsx:309,319` |
| C15 | **Substitutes picked as openers can't bat later.** Batting and bowling lists in the engines use only `playingXI_*` and ignore `substitutes_*`. | engines |
| C16 | **`selectNewBowler` is implemented twice** (wicket engine and innings engine) with slightly different inputs. | engines |
| C17 | **The extra-runs modal has no Cancel** and accepts any integer, including negative values (`parseInt`). | `LiveScoringScreen.tsx:188-220` |
| C18 | **"Runs needed" is wrong once the target is passed.** Match Details uses `Math.abs(prev - cur + 1)`, which gives a wrong positive number after the chase is complete. | `MatchDetailsScreen.tsx:137` |
| C19 | **Dismissal text uses `mockPlayers`** to look up bowler and fielder names, so these are blank for Supabase players. | `MatchDetailsScreen.tsx:72-74` |
| C20 | **A starting innings-2 hard-codes `currentInnings: 2`.** This is fine for two-innings matches, but the code assumes there are only ever two innings. | `inningsEngine.ts:77` |

### 10.3 Other business logic gaps

- Player career stats are never updated from match results. `player_stats` is only written when a player is created.
- Ratings for Supabase players are hard-coded to 50 (`playerApi.ts` `mapPlayerRecord`), and `lastFivePerformances` is always `[]`.
- The Football format list leaves out `'tournament'`, although the type allows it. Duration and player-count inputs are not validated (any string).
- Table Tennis create collects inputs and then discards them.

---

## 11. Error handling and validation

### 11.1 Patterns in use

- API layer: `console.error` and `throw`. Callers usually wrap the call in `try/catch` with `Alert.alert('Error', …)`.
- `runWithGlobalLoading(fn, message)` shows the overlay and always hides it in `finally`.

### 11.2 Gaps

| Area | Problem |
|------|---------|
| Delete team | `deleteTeamInfo` is called twice with no `await` or `catch`. A success alert always shows. A failure becomes an unhandled promise rejection. |
| Delete player | Wrong table (see S-list / finding 1). Not awaited. No refetch. A success alert always shows. |
| Add team | The form is cleared and the modal closed **before** the save, so on failure the user loses their input. The error message is generic. |
| Delete stadium | Local only. It reports "removed successfully", but the row stays in Supabase and reappears on the next fetch. |
| Data load failures | Teams/players fall back to mocks silently. No error UI and no retry. |
| Not found vs. loading | Player, Team and Match detail screens show "not found" while data is still loading (for example on a deep link or cold start). |
| Web | `Alert.alert` with buttons does nothing on react-native-web. All confirm/choice flows are dead on web, including create/start match, delete, logout, innings change and match end. Errors shown with `Alert` are also invisible on web. |
| Login | `getUserRole` returns `null` on any error, so the user sees "Unable to load user role". The Supabase sign-in has already succeeded at that point, so the user is half-signed-in. |
| Live scoring | Engine callbacks run inside chains of `setTimeout(300)`. If a user dismisses an action sheet (index `undefined`), the flow stops part-way. For example, cancelling the new-batsman picker leaves the striker still set to the dismissed player. |
| Validation | Create cricket match: `totalOvers` and player count are not range-checked (`0` or `NaN` possible on web), and the ground is required but there's no message when `grounds` is empty. Team short name: the label says 2–4 characters, but only `maxLength=4` is enforced. Email format and password length are left to Supabase. |
| Global overlay | Doesn't block input (`pointerEvents="box-none"`), so double-taps can submit twice (for example "Add Team" has no disabled state). |
| No error boundary | One render-time error (for example `player.stats.average.toFixed` on `null`) crashes the whole app. |

### 11.3 Loading and empty states

| Screen | Loading | Empty | Error |
|--------|---------|-------|-------|
| Home | text "Loading..." until init | none for players/matches | none |
| Matches | none (fake refresh) | live and upcoming only, **no "completed" or "all" empty state** | none |
| Teams | `runWithGlobalLoading` on refresh | **none** (empty list) | Alert on add only |
| Profile | none | hides stats if no player | none |
| Player / Team / Match details | none ("not found" shown instead) | partial | none |
| Manage Stadiums | spinner | "No stadiums added yet" | Alert |
| Notifications | none | yes | none |
| Create match screens | none | **no message when there are no teams, players or grounds** | none |

---

## 12. Tests and build processes

### 12.1 Results of running the tooling (2026-11-19)

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` (main checkout, with `expo-env.d.ts`) | **Pass**, 0 errors. |
| `npx tsc --noEmit` (fresh worktree, no `expo-env.d.ts`) | **Fail**: 3 × `TS2591 Cannot find name 'process'` in `api/supabaseClient.ts`. A fresh clone must run `expo start` once (or add `@types/node` / commit a types reference) before type-checking. |
| `npm run lint` | **0 errors, 8 warnings**: unused imports (`use`, `Check` in manage-stadiums, `getMatches` in Match Details), unused `groundsQuery` and `data` variables, and `react-hooks/exhaustive-deps` in AppContext, manage-stadiums and LiveScoringScreen. |
| `jest --ci` | **Fail**: `__tests__/home-screen-test.tsx` can't load because `supabaseClient.ts` throws on the missing key. Even with a key it would fail: it renders `HomeScreen` with no providers and expects the text `'Welcome!'`, which the screen doesn't contain. |

### 12.2 Test coverage

- One test file (a smoke render). No tests for the scoring engines, API mapping (`mapPlayerRecord`), context logic or create-match validation.
- The `npm test` script uses `--watchAll`, which isn't suitable for CI.
- An empty `__mocks__/` folder exists in the main checkout (untracked). No Supabase or AsyncStorage mocks are set up.
- `docs/PROJECT_OVERVIEW.md` says `transformIgnorePatterns` lacks `@nkzw/create-context-hook`. That wasn't checked in this run, because the suite fails earlier on the env var.

### 12.3 Build and CI

- Scripts: `start`, `android`, `ios`, `web` (all `expo start`), `lint`, `test`, `reset-project` (destructive template script; don't run).
- No `eas.json`, so native build and release configuration is **Unknown**. `ios/` and `android/` are git-ignored (CNG / prebuild).
- No CI configuration (no `.github/workflows`).
- `app.json` still has template values: `userInterfaceStyle: "automatic"` (the app is dark-only), splash background `#ffffff`, Android adaptive icon background `#E6F4FE`, and template icons and favicon. `web.output: "static"` means static rendering. AsyncStorage init on the server render path is **Unknown** / untested.
- README is the unmodified create-expo-app template and recommends `npm run reset-project`, which would wipe `app/`.

---

## 13. Technical debt and problems

### 13.1 Duplicate or unnecessary code

| Item | Detail |
|------|--------|
| `selectNewBowler` ×2 | `wicketEngine.ts` and `inningsEngine.ts`. |
| Team-reorder block | Copied in both Alert buttons of cricket `handleCreateMatch`. `battingTeamId` is computed three times. |
| Match providers | Cricket and football providers are near-identical. |
| Create-match wizard UI | Three screens with separate progress, footer and selection UIs. |
| `getTeamPlayers` | Exists in both `api/playerApi.ts` (unused) and `DataProvider`. |
| Team details | Each "top performer" sorts the squad three times in one render (nine sorts per render). |
| Unused code | `constants/theme.ts`, `hooks/*` (Expo template), `getCurrentUser`, `signOut`, `getMatches`, `uploadBallInfo`, `startMatch`, `DataProvider` local mutators, `mockTournaments`, an empty `<Modal visible={false}>` in LiveScoringScreen, the `commentary` tab type, `isOnline`/`setIsOnline`, the `thisOver` field. |
| Unused packages | See §2.2. |
| Mock data | 1,188-line `mocks/data.ts` shipped in the production bundle and still imported by 5 modules. |

### 13.2 Inconsistent UI patterns

- **App name:** "Company Sports Portal" (login, More footer), "FAQSports" (`app.json`) and "FAQ Sports" (docs).
- **Sport availability:** Home allows Football and TT, but More lists them as "Coming soon" (disabled).
- **Header close behaviour:** Create screens and Manage Stadiums override `headerLeft` with an X. Other stack screens use the default back button.
- **Delete patterns:** swipe-to-reveal (Teams) vs. a trash icon (Stadiums).
- **Toss emoji:** ⚾ for "bowl first" and "Top Wicket Taker" — a baseball emoji in a cricket app.
- **Raw colours:** some hex values bypass `Colors` (team colour picker list, `rgba` overlay, `#000000` team fallback), and colours are mixed with alpha suffixes (`${color}20`).
- **Touchable components:** everything uses `TouchableOpacity`. There are no shared `Button` or `Pressable` components, and accessibility labels are absent across the app.
- **Lists:** every list uses `ScrollView` + `.map()`. No `FlatList` is used anywhere.
- **Fake pull-to-refresh** on Home and Matches. Teams does a real refetch.

### 13.3 Performance bottlenecks

- `ScrollView` + `map` for all player and team lists. Fine for an office roster, but it won't scale and renders everything.
- `getTeamPlayers(team.id)` inside `teams.map` is O(teams × players) per render, and it's repeated in the change-team modal.
- Context values aren't memoized, so any `useData` change re-renders every consumer, including the live scoring screen.
- `select *` with no column list or pagination for players and teams.
- Live scoring callbacks rebuild on every `currentMatch` change. Every ball copies the whole `allBalls` array.
- `mocks/data.ts` is bundled into production.
- The `PanResponder` in `SwipeableCard` uses the JS-driven `Animated` API (`useNativeDriver: false`).

### 13.4 Other problems

- `any` is used in engine params (`getTeamById: (id) => any`, `context: any`, `router: any`). This weakens strict mode exactly where the logic is most complex.
- Many `console.log` debug statements are left in the engines (7) and APIs (2).
- Timers (`setTimeout`) chain UI prompts. This is fragile, untestable and can race with unmounts.
- `profile.tsx` matches a player with `includes()` on the first name, which is ambiguous for common names.
- `notification.tsx` `formatTime` shows negative values for future timestamps.

---

## 14. Existing functionality that must not break

These flows work today and should be covered by regression tests (manual or automated) before refactoring:

1. **Login and sign-up** against Supabase Auth, the role lookup from `profiles`, the cached role and the redirect to Home.
2. **Role-based UI**: admin badge, admin-only buttons (create match, add team/player, manage stadiums, swipe-to-delete).
3. **Sport switcher** persisted in AsyncStorage (`current_sport`), and the "Coming Soon" alert for Badminton, Carrom and UNO.
4. **Teams & Players** list from Supabase, **Add Team** (insert into `teams`), **Add Player** (insert into `players` plus a zeroed `player_stats` row), and pull-to-refresh refetch.
5. **Grounds**: list and add (Supabase `grounds`), and ground selection in cricket create match.
6. **Cricket create-match wizard**: basics → teams → toss → playing XI, substitutes with bat/bowl permissions, opening batsmen and bowler, team reordering so the batting side becomes team A, and both "Save as Upcoming" and "Start Now".
7. **Cricket live scoring**: runs 0–6, wide/no-ball with extra runs, wicket types and the fielder picker, new batsman and new bowler prompts, swap strike, change bowler, innings break with opener selection for innings 2, auto match result, manual end match.
8. **Match details scorecard**: batting and bowling tables, extras, did-not-bat list, info tab.
9. **Player and team detail screens** and their navigation from lists, the captain badge and top performers.
10. **Global loading overlay** via `runWithGlobalLoading`.
11. **Deep link pass-through** (`+native-intent.tsx`) and typed routes.
12. The route-stub pattern (`app/<sport>/*.tsx` re-exporting `sports/<sport>/screens/*`) and the provider order in `app/_layout.tsx`.

Note that items 6–8 run entirely on in-memory and mock data. Wiring them to Supabase will change their behaviour, so keep the UI flow but expect the data source to change.

---

## 15. Unknowns

| Topic | What is unknown |
|-------|-----------------|
| RLS policies | Whether any table enforces row-level security, and whether admin-only writes are restricted server-side. |
| Table definitions | Exact columns, types, defaults, constraints, FKs and `ON DELETE` rules for every table; the `matches` columns entirely. |
| `players` vs `player_stats` | Whether `players` has stat columns, is a view joining `player_stats`, or always returns null stats. |
| Profile creation | Whether a DB trigger creates `profiles` rows on sign-up, and the default role. |
| Sign-up restrictions | Email confirmation, domain restriction, invite-only. |
| Session persistence on device | Whether sessions survive app restarts on iOS/Android with the current client config (expected: no). |
| URL polyfill | Whether supabase-js 2.99 needs `react-native-url-polyfill` on RN 0.81 / Hermes here. |
| Release pipeline | EAS profiles, bundle IDs, app store setup, hosting for the web build. |
| React Compiler impact | Whether the experimental React Compiler is active in builds and how much it memoizes. |
| Static web render | Whether `web.output: "static"` pre-rendering works with AsyncStorage and the Supabase client throwing at import. |
| Supabase Edge Functions / storage buckets | None referenced in code. Whether any exist in the project is unknown. |
| Usage scale | Number of users, players and matches, which matters for the list-performance findings. |

---

## 16. Suggested priorities

These are ordered by risk, not effort. No change has been made as part of this audit.

1. **Fix data-destroying bugs:** `deletePlayerInfo` table, team delete (await, single call, error handling), and stadium delete (add an API call or remove the button).
2. **Confirm and enforce server-side authorization:** check RLS on every table, key admin writes off `profiles.role` via `auth.uid()`, and add a route guard (root layout) for authenticated and admin routes.
3. **Fix auth session handling:** AsyncStorage storage for the Supabase client, real `signOut` on logout, and restore the session on launch instead of trusting the cached role.
4. **Make tests runnable:** mock `supabaseClient` in Jest, fix the Home smoke test, and add unit tests for the scoring engines before changing them.
5. **Fix cricket rule defects** (C1–C12). Making the engines pure (input state → output state, no `setTimeout` or `Alert` inside) would make them testable.
6. **Persist matches and ball events** (`matches`, `ball_info`), and retire the mock matches. Align `TypeBallInfo` types and naming with the real schema.
7. **Web support for dialogs:** replace `Alert.alert` button flows with a cross-platform modal or confirm component.
8. **Loading, empty and error states** for all list and detail screens, and make the global overlay block input.
9. **Clean-up:** remove unused deps, template files and debug logs; dedupe `selectNewBowler` and the match providers; extract shared UI components; unify the app name and the sport availability flags.
