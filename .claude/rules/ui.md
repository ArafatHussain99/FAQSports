---
paths:
  - "app/**/*.tsx"
  - "sports/**/*.tsx"
---

# Screens and components

References: `docs/UI_UX_GUIDELINES.md`, `docs/COMPONENTS.md`.

- Colours only from `@/constants/colors`; no raw hex. Tints use `` `${Colors.x}20` `` (6-digit hex tokens only).
- Spacing: 20 horizontal screen padding, 16 card padding, 12 between cards. Radius: 16 cards, 12 buttons/inputs, 8 chips.
- Tab screens: `View` container → `SafeAreaView edges={['top']}` header → `ScrollView`. Long lists in new code: `FlatList`.
- Reuse `MatchCard` / `LiveMatchCard` for cricket matches. Check `docs/COMPONENTS.md` §4 before writing another avatar, badge, stat card or wizard; extract it to a shared component if you need it a third time.
- `Alert.alert` with buttons is a no-op on web. For new confirms or choices, use an action sheet or a modal that works on web.
- Action sheet callbacks must handle `index === undefined` (dismissed).
- Every list or detail screen needs loading, empty and error states. Don't fall back to mock data silently.
- Network writes: `runWithGlobalLoading(...)` **and** disable the button while saving (the overlay doesn't block taps). Keep form input on failure.
- Admin-only UI: check `useApp().isAdmin`.
- Add `accessibilityLabel` to icon-only buttons.
