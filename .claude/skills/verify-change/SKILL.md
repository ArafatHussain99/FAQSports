---
name: verify-change
description: Check a change in FAQ Sports before calling it done or committing it: type-check, lint, tests, docs and the relevant manual checks. Use at the end of any code change, or when asked to verify, check or get ready to commit.
---

# Verify a change

## 1. Automated checks

Run all three and report the actual output:

```bash
npx tsc --noEmit
npm run lint
npx jest --ci
```

- **In a worktree** (`.claude/worktrees/…`): `tsc` reports `Cannot find name 'process'` because `expo-env.d.ts` is missing. That error is environmental; run `tsc` from the main checkout, or ignore only that error and say so.
- Compare with the baseline in `docs/TESTING.md` §1.1 (lint had 8 warnings; the old Home test fails until the harness exists). Report new errors or warnings, don't hide them.
- Don't use `npm test` (watch mode).

## 2. Review the diff

`git diff` (and `git status` for new files):

- No `.env`, keys, or debug `console.log` of data.
- No `supabase` calls from screens; no new files under `app/` that aren't routes.
- No raw hex colours; `SafeAreaView` from `react-native-safe-area-context`.
- No new `Alert.alert` button flows (dead on web).
- Writes awaited and checked; success shown only after success.
- Admin-only behaviour also has an RLS policy (or a migration proposed).
- Cricket scoring touched → run the `cricket-rules-reviewer` agent.

## 3. Docs

Update the docs the change affects:

| Changed | Update |
|---------|--------|
| Feature status | `docs/PROJECT_OVERVIEW.md` §3, `docs/REQUIREMENTS.md` |
| Routes, providers | `docs/ARCHITECTURE.md` |
| API functions | `docs/API_DOCUMENTATION.md` |
| Tables, RLS, migrations | `docs/DATABASE_SCHEMA.md` |
| Scoring rules | `docs/BUSINESS_LOGIC.md` |
| Components, hooks | `docs/COMPONENTS.md` |
| Tests | `docs/TESTING.md` |

## 4. Manual check

Pick the relevant items from the checklist in `docs/TESTING.md` §6. The app can't start in a worktree (no `.env`); say what wasn't checked rather than claiming it works. UI changes should be checked on web **and** a device or simulator.

## 5. Report

Say what passed, what failed (with output), what wasn't checked, and which docs were updated. Don't commit unless the user asks.
