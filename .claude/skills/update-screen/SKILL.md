---
name: update-screen
description: Change an existing screen in FAQ Sports (layout, styling, fields, buttons, behaviour, data shown, loading/empty/error states) without breaking what already works. Use when the user asks to update, redesign, fix, tidy or extend an existing page, tab, modal or form. For a brand-new screen use add-screen instead.
---

# Update an existing screen

Read `docs/UI_UX_GUIDELINES.md` and `docs/COMPONENTS.md` first.

## 1. Find the real file

Routes under `app/<sport>/` are one-line re-exports; edit the screen they point to.

| Screen | File | Known issues to be aware of |
|--------|------|-----------------------------|
| Home | `app/(tabs)/index.tsx` | Fake pull-to-refresh; only screen with the login redirect |
| Matches | `app/(tabs)/matches.tsx` | Cricket only, ignores selected sport; fake refresh; no empty state for completed |
| Teams & Players | `app/(tabs)/teams.tsx` | Team delete called twice, player delete hits wrong table, form cleared before save, `position` must be an enum value |
| Profile | `app/(tabs)/profile.tsx` | Picks "my" player by name guess; Settings, Manage Players, Tournaments do nothing |
| More | `app/(tabs)/more.tsx` | Several empty handlers; Football/TT marked "Coming soon" unlike Home |
| Login | `app/login.tsx` | Password trimmed; half-signed-in if role lookup fails |
| Player profile | `app/player/[id].tsx` | Ratings fixed at 50, comments not saved, "not found" while loading |
| Team details | `app/team/[id].tsx` | Sorts squad repeatedly per render; "not found" while loading |
| Manage Stadiums | `app/manage-stadiums.tsx` | Delete is local only |
| Notifications | `app/notification.tsx` | Mock data; negative times for future dates |
| Cricket create | `sports/cricket/screens/CreateMatchScreen.tsx` | No range checks on overs/players; swaps teams so `teamA` bats first (keep this) |
| Live scoring | `sports/cricket/screens/LiveScoringScreen.tsx` | Scoring logic belongs in engines (use `cricket-engine-change`) |
| Match details | `sports/cricket/screens/MatchDetailsScreen.tsx` | Dismissal names from mock players; "runs needed" wrong after chase |
| Football create | `sports/football/screens/CreateMatchScreen.tsx` | Grounds from mocks; lineup limit check broken |
| Table Tennis create | `sports/table-tennis/screens/CreateMatchScreen.tsx` | Saves nothing; grounds from mocks |

Full list with line numbers: `docs/PROJECT_AUDIT.md` §11–13.

## 2. Scope the change

- Do what was asked. Don't fix unrelated known issues in the same change; mention any you hit and offer them as follow-ups.
- If the request changes a business rule (validation, who can do what, scoring), check `docs/REQUIREMENTS.md` §7 and ask if it's open.
- If the change needs data the API doesn't provide, use `add-api-function`; for a missing column or policy, `supabase-sql`.
- Scoring behaviour changes go through `cricket-engine-change`, not the screen.

## 3. Know what must keep working

Before editing, read the screen end to end and list the behaviour it has now: what it shows, every button and what it does, admin-only parts (`isAdmin`), navigation in and out, and which context hooks and API calls it uses. Cross-check `docs/TESTING.md` §6 (manual regression checklist). After the change, all of it must still work unless the user asked to change it.

## 4. Make the change

- Keep the file's structure: default-export component, `StyleSheet.create` at the bottom, colours from `@/constants/colors`, spacing and radius from `docs/UI_UX_GUIDELINES.md` §4.
- Reuse `MatchCard` / `LiveMatchCard` and existing styles. If you're about to copy UI that already exists in another screen for the third time (avatar, team badge, stat card, wizard footer, empty state), extract it into a shared component and use it in this screen only; leave other screens for a follow-up.
- Touching a confirm or choice flow: replace `Alert.alert` buttons with something that works on web, or at least don't add new ones.
- Touching data loading: add loading, empty and error states; no silent fallback to mocks.
- Touching a save: `runWithGlobalLoading`, disable the button while saving, keep form input on failure, success message only after the write is confirmed.
- Touching admin-only UI: hide it with `isAdmin`; for an admin-only screen also check `isAdmin` inside it.
- Add `accessibilityLabel` to icon-only buttons you add or change.
- Lists you rework: prefer `FlatList` over `ScrollView` + `map` when the list can grow.

## 5. Check it

1. Run the `verify-change` skill.
2. Walk through the behaviour list from step 3 on **web and a device or simulator** (the app can't start in a worktree; say so if you couldn't check).
3. Check both admin and player accounts if the screen has admin-only parts.
4. Update docs if what the screen does changed: `docs/COMPONENTS.md` §5 (screens), `docs/REQUIREMENTS.md` (feature status), and remove fixed items from the "known issues" column above.
