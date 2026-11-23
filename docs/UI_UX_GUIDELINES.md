# FAQ Sports — UI/UX Guidelines

**Last updated:** 2026-11-19 (from source at commit `1f86ac9`)

Related: [COMPONENTS.md](COMPONENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md#4-navigation) · [PROJECT_AUDIT.md §13.2](PROJECT_AUDIT.md#132-inconsistent-ui-patterns)

These guidelines describe the patterns the app **already uses**, so new screens match. Where the current code is inconsistent, this page says which pattern to follow and marks the rest as known inconsistencies. There is no design file (Figma or similar) in the repo; whether one exists is **Unknown**.

## 1. Principles in the current design

- **Dark only.** Every screen uses the dark palette in `constants/colors.tsx`. (`app.json` still says `userInterfaceStyle: "automatic"`; the app ignores the system theme.)
- **Card-based layout.** Content sits in rounded cards on a near-black background.
- **Sport colour coding.** Each sport has its own colour, used for its icon, chips and highlights.
- **Status colour coding.** Live is red, upcoming amber, completed teal.
- **Role is always visible.** Home and Profile show an ADMIN / PLAYER badge.

## 2. Colour tokens

Always import `Colors` from `@/constants/colors`; don't write raw hex in screens.

| Group | Token | Value | Use |
|-------|-------|-------|-----|
| Surfaces | `background` | `#0A0E14` | Screen background |
| | `surface` | `#131920` | Headers, tab bar, modals |
| | `surfaceLight` | `#1A2129` | Inputs, secondary blocks |
| | `card` | `#1E252D` | Cards |
| | `cardHover` | `#252D36` | Pressed / selected card |
| Brand | `primary` | `#00D4AA` | Main actions, active tab |
| | `primaryDark` | `#00A88A` | Pressed primary |
| | `secondary` | `#4A9EFF` | Secondary accents |
| | `accent` | `#FF6B35` | Highlights |
| Status | `live` | `#FF4757` | Live badge |
| | `liveGlow` | `rgba(255,71,87,0.3)` | Live pulse |
| | `upcoming` | `#FFB830` | Upcoming badge |
| | `completed` | `#00D4AA` | Completed badge |
| | `cancelled` | `#6B7280` | Cancelled badge |
| Text | `text` | `#FFFFFF` | Primary text |
| | `textSecondary` | `#8B9AAB` | Labels, subtitles |
| | `textMuted` | `#5C6B7A` | Hints, inactive tabs |
| Lines | `border` | `#2A3441` | Card and input borders |
| | `borderLight` | `#3A4451` | Dividers on cards |
| Feedback | `success` / `warning` / `error` / `info` | `#00D4AA` / `#FFB830` / `#FF4757` / `#4A9EFF` | Messages |
| Sports | `cricket` `football` `tableTennis` `badminton` `carrom` `uno` | `#2ECC71` `#3498DB` `#E74C3C` `#9B59B6` `#F39C12` `#1ABC9C` | Sport identity |
| Roles | `adminBadge` / `playerBadge` | `#FF6B35` / `#4A9EFF` | Role badges |

**Tinted backgrounds:** the code appends a hex alpha to a token, e.g. `` `${Colors.live}20` `` for a 12% tint behind a status badge. Use this only with 6-digit hex tokens (it breaks on `liveGlow`, which is `rgba`).

**Team colours:** teams pick one of six presets in the Add Team modal (`#2ECC71`, `#E74C3C`, `#3498DB`, `#F39C12`, `#9B59B6`, `#1ABC9C`, the same as the sport colours). These are raw hex in `teams.tsx`.

## 3. Typography

System font only (no custom fonts loaded). Most used values:

| Role | Size | Weight |
|------|------|--------|
| Screen title (tab screens) | 28 | `'700'` |
| Section title | 16–18 (More uses 13) | `'600'`–`'700'` |
| Card title / body | 16 | `'600'` |
| Body / button text | 14 | `'600'` |
| Secondary text | 13 | `'500'`–`'600'` |
| Caption, badge | 11–12 | `'600'`–`'700'` |

Badges and status labels use upper case (`LIVE`, `ADMIN`).

## 4. Spacing and shape

| Property | Common values | Guideline |
|----------|---------------|-----------|
| Screen horizontal padding | 20 (most screens), 16 | Use 20 for new screens. |
| Card padding | 16, 14 | Use 16. |
| Gaps between items | 12, 8, 10 | Use 12 between cards, 8 inside rows. |
| Card radius | 16, 14, 12 | 16 for cards, 12 for buttons and inputs, 8 for chips, 4–6 for badges. |
| Bottom tab bar | height 85, padding top 8 | Defined in `app/(tabs)/_layout.tsx`. |

## 5. Layout patterns

### 5.1 Screen shell

Tab screens:

```tsx
<View style={styles.container}>                      {/* flex 1, Colors.background */}
  <SafeAreaView edges={['top']} style={styles.safeTop}>
    <View style={styles.header}>…title + action icon…</View>
  </SafeAreaView>
  <ScrollView contentContainerStyle={styles.scrollContent}>…cards…</ScrollView>
</View>
```

- Import `SafeAreaView` from `react-native-safe-area-context` (all current screens do).
- Stack screens use the native header from `app/_layout.tsx` (`Colors.surface` background, white tint, "Back" title).
- Modal create screens (`presentation: 'modal'`) replace the header left button with an X that calls `router.back()`.

### 5.2 Multi-step create wizard

Cricket (4 steps), Football (3) and Table Tennis (2) share this pattern, each with its own copy of the code:

1. Progress dots at the top; the current step is highlighted.
2. One step's content in a `ScrollView`.
3. A fixed footer with Back and Continue. Continue is disabled (dimmed) until `canProceed()` is true. On the last step it reads "Create Match" (cricket) or "Create".
4. On create, an `Alert` asks "Save as Upcoming" or "Start Now".

New sports should follow this flow. Extracting a shared wizard component is a known to-do ([COMPONENTS.md §4](COMPONENTS.md#4-missing-shared-components)).

### 5.3 Lists and cards

- Lists are `ScrollView` + `.map()`. For long lists in new code, prefer `FlatList`.
- Tappable cards use `TouchableOpacity` with `activeOpacity` 0.7–0.8 and navigate with `router.push`.
- Player rows show an initial-letter avatar circle, name, and a stat on the right.
- Team rows show a colour badge with the short name.

### 5.4 Status badges

A rounded pill with a dot and upper-case label, tinted background (`${color}20`), coloured text. `LiveMatchCard` adds a pulsing dot (opacity 1 ↔ 0.6, 800 ms).

## 6. Interaction patterns

| Pattern | Current use | Guideline |
|---------|-------------|-----------|
| Confirm / choose | `Alert.alert` with buttons | **Doesn't work on web.** For new flows that must work on web, use a modal or action sheet, or add a cross-platform confirm helper. |
| Pick from a list during scoring | `showActionSheetWithOptions` (`@expo/react-native-action-sheet`) | Always pass a Cancel option and handle `index === undefined`. |
| Long-running work | `runWithGlobalLoading(fn, 'Saving team...')` | Use it for every network write. Also disable the button, because the overlay doesn't block taps. |
| Success | `Alert.alert('Success', '… added successfully!')` | Only show after the write is confirmed. |
| Errors | `Alert.alert('Error', message)` | Show the action that failed; keep the user's input. |
| Delete | Swipe left to reveal (Teams); trash icon (Stadiums) | Inconsistent. Pick one before adding more delete actions. |
| Pull to refresh | Real refetch on Teams; fake 1-second spinner on Home and Matches | Only add pull-to-refresh when it actually refetches. |
| Haptics | Medium impact on each scoring tap | Guard with `Platform.OS !== 'web'`. |
| "Coming Soon" | Alert on Badminton, Carrom, UNO | Keep sport availability in one place (today Home and More disagree). |

## 7. States every screen should handle

| State | Current practice | Guideline |
|-------|------------------|-----------|
| Loading | Home shows "Loading..."; Manage Stadiums shows a spinner; most screens show nothing. | Show a spinner or skeleton while data loads. Don't show "not found" until loading has finished. |
| Empty | Matches (live, upcoming), Notifications and Stadiums have empty messages. Teams and create screens don't. | Every list needs an empty message with a next step ("No teams yet. Tap + to add one."). |
| Error | Only on writes. Read failures silently show mock data. | Show an error with a Retry. |

The current per-screen state is in [PROJECT_AUDIT.md §11.3](PROJECT_AUDIT.md#113-loading-and-empty-states).

## 8. Accessibility

There are no `accessibilityLabel`, `accessibilityRole` or `accessibilityHint` props anywhere in the app today. For new code:

- Give icon-only buttons (X, +, settings, undo, swap) an `accessibilityLabel`.
- Keep touch targets at least 44×44.
- Don't rely on colour alone for status; the badges already include text, keep it.
- `textMuted` (`#5C6B7A`) on `background` is low contrast; don't use it for essential text.

## 9. Content and naming

| Item | Current | Guideline |
|------|---------|-----------|
| App name | "Company Sports Portal" (Login, More footer), "FAQSports" (`app.json`), "FAQ Sports" (docs) | Unknown which is correct; pick one ([REQUIREMENTS.md §7](REQUIREMENTS.md#7-open-questions)). |
| Sport emoji | 🏏 ⚽ 🏓 🏸 🎱 🃏 (Home switcher) | Keep. ⚾ is used for "bowl first" and "Top Wicket Taker"; that's a baseball, consider replacing. |
| Table Tennis label | "TT" on Home, "Table Tennis" elsewhere | Fine for the narrow switcher. |
| Support email | `support@company.com` | Placeholder; needs the real address. |

## 10. Known inconsistencies to fix

1. Sport availability differs between Home (Football and TT selectable) and More (marked "Coming soon").
2. Two delete patterns.
3. Fake pull-to-refresh on two screens.
4. Raw hex colours in Teams (colour presets, `#000000` fallback) and the loading overlay (`rgba(0,0,0,0.25)`).
5. No shared button, input, chip, avatar or empty-state components ([COMPONENTS.md §4](COMPONENTS.md#4-missing-shared-components)).
6. `app.json` splash and adaptive icon backgrounds are light template colours on a dark app.
