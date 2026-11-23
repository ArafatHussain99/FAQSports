---
paths:
  - "sports/cricket/**"
---

# Cricket

Reference: `docs/BUSINESS_LOGIC.md` (rules as implemented, defects C1–C20) and `docs/REQUIREMENTS.md` §7 (decided rules).

- Scoring rules belong in `sports/cricket/engines/*`, not in `LiveScoringScreen`. The screen passes callbacks via `ScoreEngineParams`, `WicketEngineParams`, `InningsEngineParams`.
- Decided rules (2026-11-19) — the code doesn't fully follow them yet:
  - Byes and leg byes are legal balls and are **not** charged to the bowler.
  - Level scores after both innings: prompt the scorer to end as a draw/tie or play a super over (super over rules still open).
  - All out = playing XI size − 1 wickets.
- Open rules (undo limit, retired hurt, substitutes' rights, bowler limits, hit wicket): ask the user; don't invent them.
- `teamA` is always the side batting first. `CreateMatchScreen` swaps teams to guarantee this, and the result logic depends on it.
- The engines mutate nested state and some code relies on it (C4). Don't add more mutation; if you touch an engine function, return new objects and check every caller.
- `selectNewBowler` exists in both `wicketEngine.ts` and `inningsEngine.ts` (C16). Change both or consolidate.
- Matches and balls are not persisted; `getMatches` and `uploadBallInfo` are unused. `TypeBallInfo.matchId` is a number but match IDs are strings.
- Before changing engine behaviour, add or update unit tests (`docs/TESTING.md` §5.1). After a scoring change, use the `cricket-rules-reviewer` agent, and update `docs/BUSINESS_LOGIC.md` when behaviour changes.
