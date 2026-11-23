---
paths:
  - "__tests__/**"
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Tests

Reference: `docs/TESTING.md`.

- Run once with `npx jest --ci` (or `npx jest <file>`). `npm test` is watch mode and never exits.
- Anything importing `api/*` loads `api/supabaseClient.ts`, which throws without a key. Mock `@/api/supabaseClient` instead of using a real key; tests must stay offline.
- Mock AsyncStorage with `@react-native-async-storage/async-storage/jest/async-storage-mock`.
- Screens need the full provider tree (`QueryClientProvider` with `retry: false`, `AppProvider`, `DataProvider`, sport providers, `ActionSheetProvider`) and a mocked `expo-router`.
- Engine tests: pass `jest.fn()` for action sheets and call the callback with an index; `jest.spyOn(Alert, 'alert')`; `jest.useFakeTimers()` for the 300 ms `setTimeout` chains; mock `expo-haptics`. Build a fresh match per test (engines mutate input).
- A test that documents a known defect should reference its ID (e.g. `C8`) from `docs/BUSINESS_LOGIC.md`.
