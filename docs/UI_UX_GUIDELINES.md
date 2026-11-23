# FAQ Sports — UI/UX Guidelines

**Last updated:** 2026-11-23 (redesign "The Fixture Sheet")

Related: [COMPONENTS.md](COMPONENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md#4-navigation) · [PROJECT_AUDIT.md §13.2](PROJECT_AUDIT.md#132-inconsistent-ui-patterns) · [../PRODUCT.md](../PRODUCT.md)

These guidelines describe the patterns the app uses, so new screens match. The visual direction is recorded in `.impeccable/surfaces/constants-colors-tsx.md`. There is no design file (Figma or similar).

## 1. Principles

- **The Fixture Sheet.** Every match is a line on FAQ's own printed fixture sheet: bright paper, black print, hairline rules. Flat: no shadows, glows or gradients.
- **Light, for daylight.** The main user scores live outdoors on a phone, so the app is light and high-contrast. There is no dark mode yet (styles are static `StyleSheet.create` objects).
- **The highlighter is the signature.** `Colors.highlight` sits only behind what is live or current: the live match card, the batter on strike, the selected option in a wizard. Never as decoration.
- **Colour decodes.** Team and sport colours appear as small pin dots; status colours appear on tags and text with a label. Blue (`primary`) means "you can press this".
- **Scale carries hierarchy.** Scores are very large tabular numerals; labels are small and quiet.
- **Native first.** Standard tab bar, stack headers, action sheets and controls on each OS. 48px minimum touch targets.

## 2. Colour tokens

Always import `Colors` from `@/constants/colors`; don't write raw hex in screens.

| Group | Token | Value | Use |
|-------|-------|-------|-----|
| Paper | `background` | `#F7F6F1` | Screen background |
| | `surface` | `#FBFAF7` | Headers, tab bar, sheets, modals |
| | `surfaceLight` | `#EFEDE6` | Avatars, tracks, pressed rows |
| | `card` | `#FFFFFF` | Cards, inputs, list groups |
| | `cardHover` | `#EFEDE6` | Pressed / selected card |
| Ink | `text` | `#16181D` | Primary text |
| | `textSecondary` | `#4E525B` | Labels, subtitles |
| | `textMuted` | `#6B6F78` | Hints, placeholders (not essential text) |
| | `textInverse` | `#FFFFFF` | Text on primary, live, error and ink fills |
| | `ink` | `#16181D` | Strong rules, selected underline, boundary keys |
| Rules | `border` | `#D6D4CC` | The one hairline (`Hairline` width) |
| | `borderLight` | `#E6E4DD` | Inner separators |
| Actions | `primary` / `primaryDark` | `#1F5FD1` / `#174AA6` | Primary buttons, links, active tab |
| | `onPrimary` | `#FFFFFF` | Text on `primary` |
| | `secondary` | `#16181D` | Secondary accents |
| | `accent` | `#B4540A` | Rare highlights |
| Signature | `highlight` | `#E8F24A` | Live / current / selected only |
| | `highlightSoft` | `#F4F8B8` | Unread rows, not-out batters |
| | `onHighlight` | `#16181D` | Text on the highlighter |
| Status | `live` | `#D7263D` | LIVE tag, OUT key, wicket balls |
| | `upcoming` | `#9A6410` | Upcoming tag |
| | `completed` | `#2F7D4F` | Result tag and text |
| | `cancelled` | `#6B6F78` | Cancelled tag |
| Feedback | `success` / `warning` / `error` / `info` | `#2F7D4F` / `#9A6410` / `#D7263D` / `#1F5FD1` | Messages; `warning` also marks extras |
| Sports | `cricket` `football` `tableTennis` `badminton` `carrom` `uno` | `#2F7D4F` `#1F5FD1` `#D7263D` `#7A4FB5` `#B4540A` `#0E8C7F` | Sport pin dots |
| Roles | `adminBadge` / `playerBadge` | `#E8F24A` / `#D5E2FA` | Role tag fills (ink text) |
| Overlay | `scrim` | `rgba(22,24,29,0.35)` | Behind sheets and the loading overlay |

**Tinted backgrounds:** `` `${Colors.live}20` `` still works for 12% tints, but only on 6-digit hex tokens (not `liveGlow` or `scrim`).

**Text on colour:** use `textInverse` / `onPrimary` on dark fills and `onHighlight` on the highlighter. `Colors.text` is now dark.

## 3. Typography

System font only (SF on iOS, Roboto on Android). Use the `Type` styles from `@/constants/tokens` by spreading them: `{ ...Type.headline, color: Colors.text }`.

| Token | Size / weight | Use |
|-------|---------------|-----|
| `largeTitle` | 32 / 800 | Tab screen titles |
| `title` | 22 / 800 | Section and step headings (sentence case) |
| `headline` | 17 / 700 | Row titles, button labels |
| `body` / `bodyStrong` | 16 / 400, 600 | Body text, team names |
| `subhead` | 14 / 500 | Secondary lines, text buttons |
| `footnote` | 13 / 500 | Meta, dates, table headers |
| `caption` | 12 / 600 | Small labels |
| `tag` | 11 / 800, tracked | Upper-case status and role tags |
| `scoreXL` / `scoreL` / `scoreM` | 64 / 40 / 24, 800, tabular | Scores |
| `number` | 16 / 700, tabular | Stats in rows and tables |

No eyebrow labels above headings. Tags (`LIVE`, `ADMIN`) are the only upper-case text.

## 4. Spacing and shape

Use `Space`, `Radius`, `Hairline` and `Touch` from `@/constants/tokens`.

| Property | Token | Value |
|----------|-------|-------|
| Screen gutter | `Space.xl` | 20 |
| Card padding | `Space.lg` | 16 |
| Gap between cards | `Space.md` | 12 |
| Inside rows | `Space.sm` | 8 |
| Above a section heading | `Space.section` | 28 (more than below it) |
| Highlighter block | `Radius.xs` | 2 |
| Tags | `Radius.sm` | 4 |
| Buttons, inputs, cards | `Radius.md` | 8 |
| Sheets | `Radius.lg` | 12 (top corners) |
| Dividers | `Hairline` | `StyleSheet.hairlineWidth` |
| Touch target | `Touch` | 48 |

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

1. "Step N of M" in footnote text over a segmented progress rule (ink for done and current, `border` for the rest).
2. One step's content in a `ScrollView`.
3. Options are white hairline rows or chips; the selected one sits on the highlighter. Multi-select lists use check boxes.
4. A fixed footer in the bottom safe area with an outlined Back button and a blue Continue button, both 48px. Continue is disabled (opacity 0.4) until `canProceed()` is true. On the last step it reads "Create Match" (cricket) or "Create".
5. On create, an `Alert` asks "Save as Upcoming" or "Start Now".

New sports should follow this flow. Extracting a shared wizard component is a known to-do ([COMPONENTS.md §4](COMPONENTS.md#4-missing-shared-components)).

### 5.3 Lists and cards

- Lists are `ScrollView` + `.map()`. For long lists in new code, prefer `FlatList`.
- Tappable cards use `TouchableOpacity` with `activeOpacity` 0.7–0.8 and navigate with `router.push`.
- Rows are separated by hairlines, either directly on the paper or inside a white `card` group with a hairline border. No nested cards and no side stripes.
- Player rows show a 40px initial avatar on `surfaceLight`, the name, and a tabular stat on the right.
- Team rows show a 12px pin dot in the team colour before the name.
- The live match uses `LiveMatchCard` (the highlighter); other matches use `MatchCard`. Neither has horizontal margin: the screen supplies the gutter.

### 5.4 Status badges

An upper-case `Type.tag` label in the status colour with a 1px border of the same colour and `Radius.sm`, no fill. `LiveMatchCard` adds a pulsing live dot (opacity 1 ↔ 0.35, 800 ms). Cancelled matches stay listed with struck-through team names.

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

Icon-only buttons in the redesigned screens carry an `accessibilityLabel`. For new code:

- Give icon-only buttons (X, +, settings, undo, swap) an `accessibilityLabel`.
- Keep touch targets at least 44×44.
- Don't rely on colour alone for status; the badges already include text, keep it.
- `textMuted` (`#6B6F78`) on `background` is about 4.6:1; keep it for hints, not essential text.

## 9. Content and naming

| Item | Current | Guideline |
|------|---------|-----------|
| App name | "FAQ Sports" in the UI and docs; "FAQSports" in `app.json` | "FAQ Sports" (confirmed). |
| Sport identity | Text labels with a pin dot in the sport colour | No emoji as icons; use lucide icons or text. |
| Table Tennis label | "TT" on Home, "Table Tennis" elsewhere | Fine for the narrow switcher. |
| Support email | `support@company.com` | Placeholder; needs the real address. |

## 10. Known inconsistencies to fix

1. Sport availability differs between Home (Football and TT selectable) and More (marked "Coming soon").
2. Two delete patterns.
3. Fake pull-to-refresh on two screens.
4. Team colour presets are still stored as raw hex on each team row (data, not styling).
5. No shared button, input, chip, avatar or empty-state components ([COMPONENTS.md §4](COMPONENTS.md#4-missing-shared-components)).
6. `app.json` splash and adaptive icon backgrounds are template colours; set them to `#F7F6F1`.
7. No dark mode: the styles are static, so supporting the system appearance needs theme-aware styles.
