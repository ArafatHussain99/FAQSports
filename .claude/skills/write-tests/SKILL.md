---
name: write-tests
description: Write Jest tests for FAQ Sports (cricket scoring engines, API functions, context hooks, screens) and set up the shared test harness if it doesn't exist yet. Use when adding tests, before changing scoring logic, or when asked to make the test suite run.
---

# Write tests

Read `docs/TESTING.md` first. Run tests with `npx jest --ci` or `npx jest <file>` (not `npm test`, which watches forever).

## 1. Harness (create once, if missing)

Check for `jest.setup.ts` and `test-utils/`. If they don't exist:

1. `jest.setup.ts` at the root, registered in the `"jest"` section of `package.json` as `"setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"]`:
   ```ts
   jest.mock('@react-native-async-storage/async-storage', () =>
     require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
   jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), ImpactFeedbackStyle: { Medium: 'medium' } }));
   jest.mock('@/api/supabaseClient', () => require('./test-utils/supabaseMock'));
   ```
2. `test-utils/supabaseMock.ts`: a chainable `from()` mock (`select`, `insert`, `delete`, `eq`, `order`, `single` returning `this` or a resolved `{ data, error }`), plus `auth` methods as `jest.fn()`. Tests set return values per case.
3. `test-utils/render.tsx`: `renderWithProviders(ui)` wrapping `QueryClientProvider` (`retry: false`), `AppProvider`, `DataProvider`, `CricketMatchProvider`, `FootballMatchProvider`, `ActionSheetProvider`; mock `expo-router` (`useRouter`, `useLocalSearchParams`).
4. `test-utils/cricket.ts`: `makeMatch({ striker, nonStriker, bowler, totalOvers, xiA, xiB })` returning a fresh `CricketMatch` with one empty innings.

If `@/…` imports don't resolve, add `"moduleNameMapper": { "^@/(.*)$": "<rootDir>/$1" }` to the same section. If a transform error mentions `@nkzw/create-context-hook` or `lucide-react-native`, add them to `transformIgnorePatterns`.

Tests must stay offline: never use a real Supabase key.

## 2. What to test

| Area | File location | Focus |
|------|---------------|-------|
| Scoring engines | `__tests__/cricket/<engine>.test.ts` | Each rule in `docs/BUSINESS_LOGIC.md` §4–5 |
| API functions | `__tests__/api/<file>.test.ts` | Table name, columns sent, row mapping, error thrown |
| Hooks | `__tests__/context/*.test.tsx` | Role persistence, logout |
| Screens | `__tests__/screens/*.test.tsx` | `canProceed` rules, admin-only UI, empty/error states |

## 3. Engine tests

- Build a **fresh** match per test; the engines mutate their input.
- Pass `jest.fn()` for `updateLiveMatch`, `setLiveMatch`, `setLastBalls`, `handleInningsEnd`, `selectNewBowler`; read the last call's argument.
- Action sheets: `showActionSheetWithOptions = jest.fn((opts, cb) => cb(index))`.
- Alerts: `jest.spyOn(Alert, 'alert')`, then call the wanted button's `onPress`.
- Timers: `jest.useFakeTimers()` and `jest.advanceTimersByTime(300)` for the prompt chains.
- **Known defects:** test the *intended* rule (the decided rules in `docs/REQUIREMENTS.md` §7) and mark a failing one `test.failing('C2: bye counts as a legal ball', …)` until it's fixed. Name the defect ID.

## 4. Finish

All new tests pass (or are `test.failing` with a defect ID), then run the `verify-change` skill. Update `docs/TESTING.md` §1 if the harness or test count changed.
