---
name: cricket-engine-change
description: Change or fix cricket scoring logic in FAQ Sports (sports/cricket/engines, LiveScoringScreen, innings/result logic), including fixing known defects C1–C20. Use when asked to fix a scoring bug, change a cricket rule, or add a scoring feature such as LBW, ties or super overs.
---

# Change cricket scoring

The rules are in `docs/BUSINESS_LOGIC.md` (as implemented, defects C1–C20) and `docs/REQUIREMENTS.md` §7 (decided and open rules). Read both before touching code.

## 1. Pin down the rule

- **Decided** rule → implement it.
- **Open** question → ask the user, record the answer in `docs/REQUIREMENTS.md` §7, then implement. Never pick a rule yourself.
- Name the defect ID(s) you're fixing.

## 2. Test first

Use the `write-tests` skill. Write a test for the intended behaviour and watch it fail (or mark it `test.failing` with the defect ID). Also cover the nearby behaviour that already works, so the fix doesn't break it: runs, strike rotation, over completion, bowler change, innings end.

## 3. Change the engine

- Keep rules in `sports/cricket/engines/*`; the screen only wires callbacks (`ScoreEngineParams` etc.).
- Don't add in-place mutation. In functions you touch, build new objects (`{ ...innings, extras: { ...innings.extras } }`) and check callers that relied on the old mutation (C4), e.g. the chase check in `handleScore`.
- `teamA` always bats first; keep it that way.
- `selectNewBowler` exists in both `wicketEngine.ts` and `inningsEngine.ts` (C16). Change both or consolidate into one.
- Any new prompt: handle a dismissed action sheet (`index === undefined`) without leaving the innings half-updated, and make sure it works on web (no `Alert.alert` button flows).
- If the change affects saved data later (`ball_events`, scorecards), keep field names aligned with `docs/DATABASE_SCHEMA.md` §5 and enum values from §7.1 (e.g. `dismissal_type` includes `lbw`).

## 4. Review and document

1. Run the tests and the `verify-change` skill.
2. Run the `cricket-rules-reviewer` agent on the diff and fix what it reports.
3. Update `docs/BUSINESS_LOGIC.md`: the rule tables in §4–5 and the defect list in §6 (mark fixed ones).
4. Manually check on a device or simulator: one full over with extras, a wicket, an innings change and a result.
