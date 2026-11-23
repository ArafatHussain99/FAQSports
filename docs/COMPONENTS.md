# FAQ Sports — Components

**Last updated:** 2026-11-19 (from source at commit `1f86ac9`)

Related: [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md)

The app has very few reusable components. Most UI is written inline in each screen. This page documents what exists, the context hooks every screen depends on, the screens themselves, and the components that are duplicated and could be extracted.

## 1. Reusable components

### 1.1 `MatchCard`

`sports/cricket/components/MatchCard.tsx` — default export.

| Prop | Type | Required |
|------|------|----------|
| `match` | `CricketMatch` | yes |

- Shows status badge, match type (Long / Short Pitch), both teams (colour badge + short name), and either the score (completed) or the date and ground.
- Tapping pushes `/cricket/match/:id`.
- Looks up teams with `useData().getTeamById`. **Returns `null` if either team isn't found**, so mock matches disappear when real teams load.
- Used by: Home (upcoming and recent), Matches tab.

```tsx
import MatchCard from '@/sports/cricket/components/MatchCard';

{upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)}
```

Note: Home also passes football matches here with a cast (`match as CricketMatch`) when Football is selected. The card then has no match type label and no innings.

### 1.2 `LiveMatchCard`

`sports/cricket/components/LiveMatchCard.tsx` — default export.

| Prop | Type | Required |
|------|------|----------|
| `match` | `CricketMatch` | yes |

- Pulsing LIVE dot, match type and ground, both teams' runs/wickets (overs), and in innings 2 the target and runs needed.
- Tapping pushes `/cricket/match/:id`.
- Returns `null` if either team isn't found.
- Used by: Home, Matches tab.

```tsx
import LiveMatchCard from '@/sports/cricket/components/LiveMatchCard';

{liveMatch && <LiveMatchCard match={liveMatch} />}
```

### 1.3 `SwipeableCard` (local)

Defined inside `app/(tabs)/teams.tsx`, not exported.

| Prop | Type | Required | Notes |
|------|------|----------|-------|
| `children` | `ReactNode` | yes | The card content |
| `onDelete` | `() => void` | yes | Called from the revealed delete button |
| `isAdmin` | `boolean` | yes | Swiping only works for admins |

- Swipe left up to 100 px to reveal a red delete button; RTL-aware.
- Built with `PanResponder` and `Animated` (`useNativeDriver: false`).
- The responder is created once in `useRef`, so a later change to `isAdmin` isn't picked up.
- Used for team rows and player rows.

To reuse it, move it to a shared `components/` folder first.

### 1.4 `GlobalLoadingOverlay` (local)

Defined inside `app/_layout.tsx`. No props; reads `isGlobalLoading` and `globalLoadingMessage` from `useApp()`. Shows a centred card with a spinner and the message over a 25% black backdrop. `pointerEvents="box-none"` means it **doesn't block taps**.

Don't render it yourself; trigger it with `runWithGlobalLoading` (§3.1).

## 2. Third-party UI used directly

| Library | Used for | Where |
|---------|----------|-------|
| `@expo/react-native-action-sheet` | Option pickers (`showActionSheetWithOptions`) | Live scoring engines, via `useActionSheet()` |
| `lucide-react-native` | All icons | Every screen |
| `react-native-safe-area-context` | `SafeAreaView` | Every screen |
| `expo-router` | `Stack`, `Tabs`, `useRouter`, `useLocalSearchParams` | Routing |
| `expo-haptics` | Impact feedback on scoring | `scoreEngine.ts` |
| React Native `Modal` | Add team, add player, change team, extra runs | Teams, Live Scoring |

## 3. Context hooks

All are created with `createContextHook` from `@nkzw/create-context-hook`, which returns `[Provider, useHook]`. The provider order is in [ARCHITECTURE.md §3.1](ARCHITECTURE.md#31-provider-tree).

### 3.1 `useApp()` — `context/AppContext.tsx`

| Member | Type | Notes |
|--------|------|-------|
| `role` | `UserRole \| null` | From AsyncStorage |
| `userName` | `string` | Email local part |
| `isAdmin`, `isPlayer` | `boolean` | Derived from `role` |
| `currentSport` | `SportType` | Default `'cricket'` |
| `setCurrentSport(sport)` | `void` | Persists to AsyncStorage |
| `setRole(role, name)` | `Promise` | Persists role and name |
| `logout()` | `void` | Clears role and name only ([AUTHENTICATION.md §4.3](AUTHENTICATION.md#43-logout)) |
| `isInitialized` | `boolean` | True once stored values are loaded |
| `isLoading` | `boolean` | Init or a mutation pending |
| `isOnline`, `setIsOnline` | | Never updated |
| `isGlobalLoading`, `globalLoadingMessage` | | Overlay state |
| `setGlobalLoading(loading, message?)` | | Manual control |
| `runWithGlobalLoading(task, message?)` | `Promise<T>` | Shows the overlay while `task` runs; always hides it |

```tsx
const { isAdmin, runWithGlobalLoading } = useApp();

await runWithGlobalLoading(async () => {
  await addGround(name, location);
}, 'Adding stadium...');
```

### 3.2 `useData()` — `context/AppContext.tsx`

| Member | Type | Notes |
|--------|------|-------|
| `players`, `teams` | `Player[]`, `Team[]` | Start as mock data, replaced by Supabase data |
| `grounds` | `string[]` | Ground names from Supabase |
| `notifications`, `unreadCount` | | Mock data |
| `getPlayerById(id)`, `getTeamById(id)` | lookup | |
| `getTeamPlayers(teamId)` | `Player[]` | Filters `players` by `teamId` |
| `refetchTeams()`, `refetchPlayers()` | `Promise` | React Query refetch |
| `markNotificationRead(id)` | | Memory only |
| `addPlayer`, `updatePlayer`, `deletePlayer`, `addTeam`, `updateTeam`, `deleteTeam` | | Local-only mutators; **not used** by any screen |
| `setPlayers`, `setTeams`, `setGrounds` | | Raw setters (Manage Stadiums uses `setGrounds`) |
| `isLoadingData` | `boolean` | Teams or players loading |

### 3.3 `useCricketMatches()` — `sports/cricket/context.tsx`

| Member | Notes |
|--------|-------|
| `liveMatch` | Shown on cards and Match Details. Seeded from `mockLiveMatch`. |
| `upcomingMatches`, `completedMatches` | Seeded from mocks. |
| `currentMatch` | The match being scored. Starts `null`. |
| `setCurrentMatch`, `setLiveMatch`, `setUpcomingMatches` | Raw setters |
| `startMatch(match)` | Sets live + current and removes from upcoming. **Never called.** |
| `updateLiveMatch(match)` | Sets live and current. Called by the engines. |
| `endMatch(match, winner, result)` | Moves to completed, clears live and current. |

### 3.4 `useFootballMatches()` — `sports/football/context.tsx`

Same members as `useCricketMatches`, typed for `FootballMatch`, starting empty.

## 4. Missing shared components

These are duplicated across screens. Extracting them is the main UI clean-up.

| Candidate | Duplicated in |
|-----------|---------------|
| `Avatar` (initial in a coloured circle) | Home, Teams, Team details, Player profile, Match details |
| `TeamBadge` (colour + short name) | Teams, Team details, 3 create screens, Match details, cards |
| `StatCard` / `StatGrid` | Home, Profile, Team details, Player profile |
| `RatingBar` | Profile, Player profile |
| `StatusBadge` | MatchCard, Match details |
| `Wizard` (progress dots, footer Back/Continue) | Cricket, Football, Table Tennis create screens |
| `SelectableChip` / `SelectableRow` | Create screens, Teams modals |
| `EmptyState` | Matches, Notifications, Manage Stadiums |
| `FormModal` shell | Three modals in Teams |
| `ConfirmDialog` (works on web) | Replaces `Alert.alert` button flows everywhere |
| `ScreenHeader` | Tab screens |

Suggested home: a new top-level `components/` folder for shared UI (CLAUDE.md doesn't define one yet), and `sports/<sport>/components/` for sport-specific ones.

## 5. Screens

| Screen | File | Route params | Hooks used | Notes |
|--------|------|--------------|------------|-------|
| Home | `app/(tabs)/index.tsx` | — | `useApp`, `useData`, `useCricketMatches`, `useFootballMatches` | Login redirect, sport switcher, cards, top 3 players |
| Matches | `app/(tabs)/matches.tsx` | — | `useApp`, `useCricketMatches` | Filter chips; `+` opens cricket create |
| Teams | `app/(tabs)/teams.tsx` | — | `useApp`, `useData` | Teams/Players tabs, 3 modals (Change Team saves via `updatePlayerTeam`), `SwipeableCard` (height follows content) |
| Profile | `app/(tabs)/profile.tsx` | — | `useApp`, `useData` | Own stats (guessed), logout |
| More | `app/(tabs)/more.tsx` | — | `useApp`, `useData` | Menu sections |
| Login | `app/login.tsx` | — | `useApp` | Sign in / sign up |
| Player profile | `app/player/[id].tsx` | `id` | `useData`, `useApp` | Cover picture + nickname (admin Edit modal), stats, ratings, last five, comments |
| Team details | `app/team/[id].tsx` | `id` | `useData` | Squad, captain, top performers |
| Manage Stadiums | `app/manage-stadiums.tsx` | — | `useData` | Add / remove grounds |
| Notifications | `app/notification.tsx` | — | `useData` | Mark read, open match |
| Cricket create | `sports/cricket/screens/CreateMatchScreen.tsx` | — | `useData`, `useCricketMatches` | 4-step wizard |
| Live scoring | `sports/cricket/screens/LiveScoringScreen.tsx` | — | `useCricketMatches`, `useData`, `useActionSheet` | Calls engines |
| Match details | `sports/cricket/screens/MatchDetailsScreen.tsx` | `id` | `useApp`, `useCricketMatches`, `useData` | Scorecard / Info tabs |
| Football create | `sports/football/screens/CreateMatchScreen.tsx` | — | `useData`, `useFootballMatches` | 3-step wizard; grounds from mocks |
| Table Tennis create | `sports/table-tennis/screens/CreateMatchScreen.tsx` | — | `useApp`, `useData`, `useTableTennisMatches` | 2-step wizard; grounds from Supabase (mock fallback); saves to `table_tennis_matches` |
| Table Tennis scorecard | `sports/table-tennis/screens/ScorecardScreen.tsx` | `id` | `useApp`, `useData`, `useTableTennisMatches`, React Query | Setup, point-by-point scoring, undo, result; read-only for players |
| `TableTennisMatchCard` | `sports/table-tennis/components/TableTennisMatchCard.tsx` | `match` | `useData` | Home list card, opens the scorecard |

## 6. Cricket engines (non-UI modules)

Exported functions, used only by `LiveScoringScreen`. Behaviour is in [BUSINESS_LOGIC.md §3](BUSINESS_LOGIC.md#4-live-scoring).

| File | Exports |
|------|---------|
| `engines/scoreEngine.ts` | `triggerHaptic`, `handleScore`, `handleExtra`, `handleUndo`, types `ScoreEngineParams`, `ExtraHandleParams` |
| `engines/wicketEngine.ts` | `handleWicket`, `processWicket`, `selectFielder`, `dismissBatsman`, `continueWicketProcess`, `selectNewBatsman`, `selectNewBowler`, type `WicketEngineParams` |
| `engines/inningsEngine.ts` | `selectOpeningStriker`, `handleInningsEnd`, `selectNewBowler`, `swapStrike`, `handleEndMatch`, type `InningsEngineParams` |

## 7. Adding a component

- Functional component, default export, props typed with an `interface Props`.
- Styles in a `StyleSheet.create` at the bottom of the file, colours from `Colors`.
- Sport-specific → `sports/<sport>/components/`; shared → a shared folder (see §4).
- Get data from context hooks; don't call `supabase` from a component.
- Add an `accessibilityLabel` to icon-only buttons ([UI_UX_GUIDELINES.md §8](UI_UX_GUIDELINES.md#8-accessibility)).
