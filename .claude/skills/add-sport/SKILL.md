---
name: add-sport
description: Add a new sport (or build out a placeholder one such as badminton, carrom or uno) to FAQ Sports, following the per-sport folder layout. Use when the user asks to add, implement or enable a sport.
---

# Add a sport

Follow the cricket layout. Read `docs/ARCHITECTURE.md` §2–3 and `docs/BUSINESS_LOGIC.md` first.

## 0. Confirm the rules

Before writing scoring code, confirm the sport's rules with the user (format, scoring units, how a match ends, which player stats matter). Record the answers in `docs/REQUIREMENTS.md` §7. Don't invent rules.

## 1. Types and constants

- `types/index.ts`: add the id to `SportType` if it's new (badminton, carrom and uno already exist). Use snake_case ids, like `table_tennis`.
- `constants/colors.tsx`: add a sport colour if missing.
- `sports/<sport>/types.ts`: the match type, e.g. `<Sport>Match` with `id`, `sport`, `status: MatchStatus`, teams or players, score, `createdAt`.

## 2. Sport folder

```
sports/<sport>/
  screens/CreateMatchScreen.tsx
  context.tsx       createContextHook → [<Sport>MatchProvider, use<Sport>Matches]
  types.ts
  api.ts            only if it persists data (follow api/ patterns)
  engines/          only if it has scoring rules
```

- Copy the wizard pattern from an existing create screen (progress dots, `canProceed()` per step, footer).
- Grounds come from `useData().grounds`, not `mocks/data`.
- Use a web-safe confirm for "Save as Upcoming / Start Now" (see `.claude/rules/ui.md`).

## 3. Routes

- `app/<sport-with-dashes>/create-match.tsx`: `export { default } from '@/sports/<sport>/screens/CreateMatchScreen';`
- Register it in `app/_layout.tsx`: `<Stack.Screen name="<sport>/create-match" options={{ title: 'Create … Match', presentation: 'modal' }} />`

## 4. Provider

Add `<Sport>MatchProvider` to the tree in `app/_layout.tsx`, after `FootballMatchProvider` and before `ActionSheetProvider`.

## 5. Wire into existing screens

- `app/(tabs)/index.tsx`: `sportIcons` entry; remove the id from the "Coming Soon" list; add a case to `getPlayerStat` / `getStatLabel`; Create Match routing; live/upcoming/completed selection.
- `app/(tabs)/more.tsx`: Sports section entry (and drop any "Coming soon" flag).
- `app/(tabs)/matches.tsx` if its matches should be listed.

## 6. Verify and document

- `npm run lint` and `npx tsc --noEmit` (from the main checkout if `tsc` fails on `process` in a worktree).
- Add tests for any engine logic (`docs/TESTING.md`).
- Update `docs/PROJECT_OVERVIEW.md` §3, `docs/REQUIREMENTS.md` §4, `docs/BUSINESS_LOGIC.md` §7 and, if persisted, `docs/DATABASE_SCHEMA.md` / `docs/API_DOCUMENTATION.md`.
