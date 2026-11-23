# CLAUDE.md

Guidance for Claude Code in this repository. Keep this file short: details live in `docs/`, area-specific rules in `.claude/rules/`, and multi-step procedures in `.claude/skills/`.

## 1. Project

**FAQ Sports** is an internal app for FAQ employees to manage players, teams, grounds, matches and scorecards. Expo (React Native) app for iOS, Android and web, with Supabase for auth and data.

| Sport | Status |
|-------|--------|
| Cricket | Create match, live scoring, scorecard. **In memory only**, nothing saved to Supabase. |
| Football | Create match only; matches aren't listed or scored. |
| Table Tennis | Create match (singles/doubles), point-by-point scorecard with serve rotation, saved to Supabase `table_tennis_matches`. |
| Badminton, Carrom, UNO | "Coming Soon" alert on Home. |

Roles: `admin` and `player`, read from the `profiles` table. Admin checks exist only in the UI: database policies don't check the role, and users can currently set their own role to admin (`docs/DATABASE_SCHEMA.md` §7.3).

## 2. Documentation

Read the relevant doc before changing an area, and update it when behaviour changes.

| Doc | Read it when |
|-----|--------------|
| `docs/PROJECT_OVERVIEW.md` | Starting out: feature status, what is persisted, doc map |
| `docs/REQUIREMENTS.md` | Adding or changing a feature; **§7 lists decided and open business rules** |
| `docs/ARCHITECTURE.md` | Touching navigation, providers, data flow |
| `docs/DATABASE_SCHEMA.md` | Touching any Supabase table; **§6 lists code-vs-database mismatches D1–D18; §7 has enums, delete rules, RLS policies and triggers**. Raw export: `docs/supabase-schema.sql` |
| `docs/API_DOCUMENTATION.md` | Adding or changing functions in `api/` or `sports/*/api.ts` |
| `docs/AUTHENTICATION.md` | Login, roles, sessions, route protection |
| `docs/UI_UX_GUIDELINES.md` | Building UI: colours, spacing, patterns, states |
| `docs/COMPONENTS.md` | Reusing components and context hooks |
| `docs/BUSINESS_LOGIC.md` | Any scoring or match rule; **known defects C1–C20** |
| `docs/TESTING.md` | Writing or running tests |
| `docs/PROJECT_AUDIT.md` | Severity of known issues and suggested fix order |

If the code doesn't answer a business rule, ask the user and record the answer in `docs/REQUIREMENTS.md` §7. Don't guess.

## 3. Stack

Expo SDK 54 · React Native 0.81 · React 19 · Expo Router 6 (typed routes) · TypeScript strict · Supabase (`@supabase/supabase-js`) · TanStack React Query · `@nkzw/create-context-hook` · AsyncStorage · `lucide-react-native` · Jest + `jest-expo` + React Native Testing Library. `zustand` and `@expo/vector-icons` are installed but unused.

## 4. Commands

```bash
npm install                 # npm is the default (bun.lock also exists)
npm start                   # expo start (npm run android / ios / web)
npm run lint                # expo lint
npx tsc --noEmit            # type-check
npx jest --ci               # run tests once (npm test is watch mode)
npx jest <file>             # one test file
```

- **Never run `npm run reset-project`.** It replaces `app/` with a blank starter. A hook blocks it.
- Before finishing a change, run `npm run lint` and `npx tsc --noEmit`.
- The only test currently fails (no Supabase mock); see `docs/TESTING.md` §2.

## 5. Environment

- `.env` (git-ignored) at the project root, copied from `.env.example`:
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (required; legacy `EXPO_PUBLIC_SUPABASE_ANON_KEY` is a fallback) and optional `EXPO_PUBLIC_SUPABASE_URL`. Default project: `gflkukmbxjiggvobvitb`.
- Never commit `.env`, never hard-code or log the key, never use a secret/service_role key in the app. A hook blocks edits to `.env` files.
- `api/supabaseClient.ts` throws at import if no key is set. Restart with `npx expo start -c` after changing `.env`.
- Worktrees under `.claude/worktrees/` have no `.env` and no `expo-env.d.ts`, so the app won't start and `tsc` reports `Cannot find name 'process'`. Run the app and type-check from the main checkout.

## 6. Structure

```
app/                 Expo Router routes ONLY (thin re-exports for sport screens)
sports/<sport>/      screens/ components/ engines/ api.ts context.tsx types.ts constants.ts
tournaments/         all-sport tournaments: screens/ components/ api.ts hooks.ts standings.ts types.ts
api/                 shared Supabase access (auth, teams, players, grounds)
context/AppContext.tsx   useApp (role, sport, global loading), useData (players, teams, grounds)
types/               shared types; constants/colors.tsx  colour tokens
mocks/data.ts        mock data still seeding some providers
```

- Path alias `@/*` = repo root. Inside a sport folder use relative imports.
- One sport only → `sports/<sport>/`. Shared → `api/`, `context/`, `types/`, `constants/`.
- New screen → `sports/<sport>/screens/XScreen.tsx` + one-line route in `app/<sport>/` + register in `app/_layout.tsx`.
- New sport → use the `add-sport` skill.

Full layout and diagrams: `docs/ARCHITECTURE.md`.

## 7. Rules that apply everywhere

- Screens use `api/*`, `sports/<sport>/api.ts` or context hooks, never `supabase` directly.
- Functional components, default-export screens, `StyleSheet.create` at the bottom, colours from `@/constants/colors`, `SafeAreaView` from `react-native-safe-area-context`.
- Guard native-only APIs (haptics) with `Platform.OS !== 'web'`.
- `Alert.alert` with buttons does nothing on web. Don't add new confirm flows that rely on it without a web fallback.
- Wrap network writes in `runWithGlobalLoading(fn, message)`; show success only after the write succeeds.
- Don't change application behaviour while doing docs or refactors unless asked.
- When replacing mock data, use Supabase-backed data (mocks: cricket matches, notifications, football/TT grounds).

More specific rules load automatically from `.claude/rules/` when you work in `app/`, `api/`, `sports/`, or `__tests__/`.

## 8. Claude Code setup

| Kind | Location | Purpose |
|------|----------|---------|
| Path rules | `.claude/rules/routes.md` | `app/**`: routes-only, registration, guards |
| | `.claude/rules/ui.md` | Screens and components: tokens, states, web dialogs |
| | `.claude/rules/data-access.md` | `api/**`, `sports/*/api.ts`, `context/**`: Supabase patterns |
| | `.claude/rules/cricket.md` | `sports/cricket/**`: scoring rules and known defects |
| | `.claude/rules/tests.md` | `__tests__/**`: mocks and providers |
| Skills | `.claude/skills/add-sport/` | Add or build out a sport |
| | `.claude/skills/add-screen/` | Add a screen or route (incl. admin screens) |
| | `.claude/skills/update-screen/` | Change an existing screen without breaking current behaviour |
| | `.claude/skills/add-api-function/` | Read/write a Supabase table, replace mock data |
| | `.claude/skills/supabase-sql/` | Migrations (schema, RLS) and one-off data SQL; never run by Claude |
| | `.claude/skills/cricket-engine-change/` | Fix defects C1–C20 or change scoring rules, test first |
| | `.claude/skills/write-tests/` | Jest harness, mocks and tests |
| | `.claude/skills/verify-change/` | tsc, lint, tests, diff review, docs, manual checks before "done" |
| Agent | `.claude/agents/cricket-rules-reviewer.md` | Reviews scoring changes against `docs/BUSINESS_LOGIC.md` |
| Hook | `.claude/hooks/guard.js` (in `.claude/settings.json`) | Blocks `reset-project` and edits to `.env` files |
