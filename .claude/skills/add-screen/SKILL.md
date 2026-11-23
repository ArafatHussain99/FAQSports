---
name: add-screen
description: Add a new screen or route to FAQ Sports (a sport screen, a detail screen, or an admin screen) using the routes-only app/ folder and per-sport screens. Use when the user asks for a new page, screen, modal or route.
---

# Add a screen

Read `docs/ARCHITECTURE.md` §4 and `docs/UI_UX_GUIDELINES.md` first.

## 1. Decide where it lives

| Screen is for | Screen file | Route file |
|---------------|-------------|------------|
| One sport | `sports/<sport>/screens/<Name>Screen.tsx` | `app/<sport-with-dashes>/<route>.tsx` (one-line re-export) |
| Shared (teams, players, admin) | directly in `app/<route>.tsx` | — |
| A bottom tab | `app/(tabs)/<name>.tsx` + `Tabs.Screen` in `app/(tabs)/_layout.tsx` | — |

Sport route file:

```ts
export { default } from '@/sports/<sport>/screens/<Name>Screen';
```

Never put helpers, API calls or components under `app/`.

## 2. Register the route

In `app/_layout.tsx` `RootLayoutNav`, add a `<Stack.Screen name="…" options={…} />`:

- create/edit forms: `presentation: 'modal'`, X button in `headerLeft` that calls `router.back()`
- full-screen flows (like live scoring): `headerShown: false`, `gestureEnabled: false`
- detail screens: `title` only

Dynamic segments use `[id].tsx`; read them with `useLocalSearchParams<{ id: string }>()`.

## 3. Build the screen

- Default-export a function component; `StyleSheet.create` at the bottom; colours from `@/constants/colors`.
- `SafeAreaView` from `react-native-safe-area-context`.
- Data from context hooks (`useApp`, `useData`, `use<Sport>Matches`) or `api/*` functions, never `supabase` directly.
- Handle loading, empty and error states. In `[id]` screens, don't show "not found" while data is still loading.
- **Admin screens:** hide the entry point with `useApp().isAdmin` *and* check `isAdmin` inside the screen (redirect or show "Admins only"), because routes have no guard. Server-side protection needs RLS (`docs/DATABASE_SCHEMA.md` §7.3).
- Confirm dialogs must work on web; `Alert.alert` with buttons doesn't.
- Navigate with absolute typed paths: `router.push('/team/' + id)`.

## 4. Link to it

Add the entry point (button, menu item in `app/(tabs)/more.tsx`, card tap). Show admin-only entry points only when `isAdmin`.

## 5. Finish

Run the `verify-change` skill. Add the route to the table in `docs/ARCHITECTURE.md` §4 and the screen to `docs/COMPONENTS.md` §5.
