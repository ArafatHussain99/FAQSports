# FAQ Sports — Requirements

**Last updated:** 2026-11-19 (from source at commit `1f86ac9`)

These requirements are reverse-engineered from the code. There is no separate product spec in the repo. Each requirement has a status:

| Status | Meaning |
|--------|---------|
| **Implemented** | Works end to end, including persistence where it applies. |
| **Partial** | UI exists and works, but data isn't saved, or part of the behaviour is missing or buggy. |
| **Stub** | UI exists but does nothing useful. |
| **Planned** | Referenced (menu item, type, "Coming Soon"), with no implementation. |

Related: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) · [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md) · [PROJECT_AUDIT.md](PROJECT_AUDIT.md)

---

## 1. Users and access

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-AUTH-1 | A user can create an account with full name, email and password. Only company email addresses may sign up (decided 2026-11-19). | Partial: any email is accepted today | `app/login.tsx`, `api/authApi.ts` `signUp` |
| FR-AUTH-2 | A user can sign in with email and password. | Implemented | `signIn` |
| FR-AUTH-3 | After sign-in, the app loads the user's role (`admin` or `player`) from `profiles`. | Implemented | `getUserRole` |
| FR-AUTH-4 | The app remembers the role, user name and selected sport between launches. | Implemented (AsyncStorage) | `context/AppContext.tsx` |
| FR-AUTH-5 | A signed-out user is sent to the login screen. | Partial: only the Home tab redirects | `app/(tabs)/index.tsx:31` |
| FR-AUTH-6 | A user can log out. | Partial: clears the cached role but doesn't end the Supabase session | `AppContext.tsx` `logout` |
| FR-AUTH-7 | Admin-only actions are only available to admins. | Partial: hidden in the UI, not enforced on routes or in the database; users can self-promote to admin | [AUTHENTICATION.md](AUTHENTICATION.md#5-authorization) |

## 2. Teams and players

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-TEAM-1 | Anyone can list teams and see each team's players. | Implemented | `app/(tabs)/teams.tsx`, `getTeams` |
| FR-TEAM-2 | An admin can add a team with name, short name (up to 4 characters) and colour (six presets). | Implemented | `handleAddTeam` |
| FR-TEAM-3 | An admin can delete a team. Players stay but lose their team. | Partial: the database unassigns players (`ON DELETE SET NULL`) and blocks delete once the team has played a saved match, but the delete policy only allows one specific user, and the app calls delete twice without error handling | `handleDeleteTeam` |
| FR-TEAM-4 | Team detail shows squad, captain and top run scorer, wicket taker and catcher. | Implemented | `app/team/[id].tsx` |
| FR-TEAM-5 | A team can have a captain. | Partial: read from `teams.captain_player_id`, no UI to set it | `getTeams` |
| FR-PLAYER-1 | An admin can add a player with name, optional team, position, batting style (right/left) and bowling style. A zeroed stats row is created. | Partial: `position` is a database enum but the form takes free text, so most positions fail (D3) | `handleAddPlayer` |
| FR-PLAYER-2 | An admin can delete a player. | **Broken**: deletes from `teams` | `api/playerApi.ts:27` |
| FR-PLAYER-3 | An admin can move a player to another team (or to no team). | Implemented (2026-11-19): Change Team modal saves via `updatePlayerTeam`. Needs an UPDATE policy on `players` if RLS is on (none exists) | `app/(tabs)/teams.tsx`, `api/playerApi.ts` |
| FR-PLAYER-4 | A player profile shows career stats, ratings and last five performances. | Partial: stats always 0 (read from the wrong table, D1), ratings fixed at 50, last five always empty | `mapPlayerRecord` |
| FR-PLAYER-7 | A player profile shows a cover picture and a nickname; an admin can set both. Pictures are bundled with the app (`assets/images/player-covers/`, listed in `constants/playerCovers.ts`); the database stores only the picture's key. | Implemented in app 2026-11-19; needs migration `20261119000200` | `app/player/[id].tsx`, `api/playerApi.ts` |
| FR-PLAYER-5 | Users can comment on a player profile. | Partial: comments live in screen state only | `app/player/[id].tsx` |
| FR-PLAYER-6 | The Profile tab shows the signed-in user's own player stats. | Partial: picks a player by fuzzy name match, falls back to the first player | `app/(tabs)/profile.tsx:17` |

## 3. Grounds

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-GROUND-1 | Anyone can see the list of grounds (used in match creation). | Implemented | `getGrounds` |
| FR-GROUND-2 | An admin can add a ground with a name and optional location. | Implemented | `app/manage-stadiums.tsx`, `addGround` |
| FR-GROUND-3 | An admin can remove a ground. | Partial: local state only | `manage-stadiums.tsx` |

## 4. Matches

### 4.1 Cricket

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-CRK-1 | An admin can create a match in four steps: basics, teams, toss, players. | Implemented (in memory) | `sports/cricket/screens/CreateMatchScreen.tsx` |
| FR-CRK-2 | Basics: match type (long or short pitch), total overs (default 10), players per side (default 7), ground. | Implemented; no range checks | as above |
| FR-CRK-3 | Each side picks a playing XI of at least 2 and at most "players per side". Squad plus substitutes must not exceed that number. | Implemented | `canProceed` |
| FR-CRK-4 | Players not on either team can be added as substitutes to one side, with "bat & bowl", "bat only" or "bowl only" rights. | Partial: rights are stored but never used in scoring | `selectSubstituteWithTeamAndPermissions` |
| FR-CRK-5 | The scorer picks two opening batsmen and an opening bowler. | Implemented | `toggleOpeningBatsman` |
| FR-CRK-6 | A match can be saved as upcoming or started immediately. | Implemented (in memory) | `handleCreateMatch` |
| FR-CRK-7 | Live scoring records runs 0–6, wides, no-balls, byes, leg-byes, wickets, strike swaps and bowler changes. | Partial: see defects in [BUSINESS_LOGIC.md §6](BUSINESS_LOGIC.md#6-known-defects) | `sports/cricket/engines/*` |
| FR-CRK-8 | The scorer can undo the last ball. | **Stub**: only the "This Over" strip changes | `scoreEngine.ts` `handleUndo` |
| FR-CRK-9 | The innings ends when overs run out or all batsmen are out; innings 2 starts with new openers. | Partial: a wicket on the last ball doesn't end the innings | `inningsEngine.ts` |
| FR-CRK-10 | The match ends when the chase succeeds or innings 2 ends; a result string is produced. On level scores the scorer chooses: end as a draw/tie, or play a super over (decided 2026-11-19). | Partial: wrong wicket margin, ties go to Team B, no super over | `handleInningsEnd` |
| FR-CRK-11 | The scorer can end a match manually. | Partial: equal scores go to the team that batted first | `handleEndMatch` |
| FR-CRK-12 | Anyone can view a scorecard (batting, bowling, extras, did not bat) and match info. | Implemented | `MatchDetailsScreen.tsx` |
| FR-CRK-13 | Matches and every ball are stored in Supabase. | **Planned**: `getMatches` and `uploadBallInfo` exist but are never called | `sports/cricket/api.ts` |
| FR-CRK-14 | Player career stats update from match results. | Planned | none |

### 4.2 Football

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-FB-1 | An admin can create a match: format (friendly, league, knockout), duration in minutes (default 90), players per side (default 11), ground, teams, lineups. | Partial (in memory; grounds come from mocks) | `sports/football/screens/CreateMatchScreen.tsx` |
| FR-FB-2 | Live football scoring (goals, assists, cards, substitutions). | Planned: types exist in `sports/football/types.ts` | none |
| FR-FB-3 | Football matches are listed on the Matches tab. | Planned | none |

### 4.3 Table Tennis

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-TT-1 | An admin can set up a singles or doubles match with a ground and 2 or 4 distinct players. | Implemented, saved to `table_tennis_matches` | `sports/table-tennis/screens/CreateMatchScreen.tsx` |
| FR-TT-2 | Table tennis scoring: games to 11 with 2 serves per turn or 21 with 5; deuce at 10-10 / 20-20, then 2 points in a row win; best of 1/3/5/7, serve rotation (doubles: 5 serves, then swap sides; other team's right player serves), undo. | Implemented | `sports/table-tennis/engines/scoreEngine.ts`, `sports/table-tennis/screens/ScorecardScreen.tsx` |

### 4.4 Other sports

| ID | Requirement | Status |
|----|-------------|--------|
| FR-SPORT-1 | Badminton, Carrom, UNO. | Planned ("Coming Soon" alert on Home) |

## 5. Other features

| ID | Requirement | Status | Source |
|----|-------------|--------|--------|
| FR-HOME-1 | Home shows a welcome card with role badge, a sport switcher, the live match, upcoming and recent matches, and top 3 players for the selected sport's stat (runs, goals or wins). | Implemented (matches from mocks or memory) | `app/(tabs)/index.tsx` |
| FR-MATCH-1 | Matches tab lists cricket matches filtered by all, live, upcoming, completed. | Implemented (cricket only, ignores the selected sport) | `app/(tabs)/matches.tsx` |
| FR-NOTIF-1 | Users see notifications, can mark them read, and open the related match. | Partial (mock data) | `app/notification.tsx` |
| FR-MORE-1 | Tournaments, Leaderboards, FAQ, Terms of Service. | Planned (empty handlers; `Tournament` type exists) | `app/(tabs)/more.tsx` |
| FR-MORE-2 | Contact Support opens an email. | Implemented, placeholder address `support@company.com` | `more.tsx:54` |
| FR-AUDIT-1 | Admin actions are audit-logged. | Planned (`AuditLog` type only) | `types/index.ts` |

## 6. Non-functional requirements

| ID | Requirement | Current state |
|----|-------------|---------------|
| NFR-1 | Runs on iOS, Android and web from one codebase. | Builds for all three. On web, `Alert.alert` with buttons does nothing, so confirm flows fail. |
| NFR-2 | Dark theme throughout, using shared colour tokens. | Mostly true; see [UI_UX_GUIDELINES.md](UI_UX_GUIDELINES.md). |
| NFR-3 | Supabase keys come from env vars; no secrets in the app or repo. | Met. |
| NFR-4 | TypeScript strict mode, lint clean. | `tsc` passes in the main checkout; lint has 0 errors and 8 warnings. |
| NFR-5 | Automated tests. | Not met; the only test can't run ([TESTING.md](TESTING.md)). |
| NFR-6 | Offline indicator. | Stub: `isOnline` is never updated. |
| NFR-7 | Accessible UI. | No accessibility labels anywhere. |

## 7. Open questions

These business rules can't be decided from the code. Answers should be recorded here and in [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md).

### Cricket rules

1. ~~**Byes and leg-byes**~~ — **Decided 2026-11-19:** follow the standard rule. They count as legal deliveries and their runs go to extras only, not the bowler. The code doesn't do this yet (C2, C3).
2. ~~**Ties**~~ — **Decided 2026-11-19:** when scores are level after both innings, the scorer gets a prompt to either end the match as a draw/tie or play a super over. The code currently declares a winner (C9). Super over rules (players per side, balls, what happens if the super over is also tied) are still open; see question 16.
3. **Short pitch vs long pitch:** besides the label, does match type change any rule (overs, players per side, scoring)?
4. ~~**All out**~~ — **Decided 2026-11-19:** a side is all out when one batsman is left (`players − 1` wickets). This matches the current code.
5. **Retired hurt:** can a retired batsman come back to bat later? The code lets them be picked again.
6. **Undo:** how many balls can be undone? The prompt says "Max 2".
7. **Substitutes:** should "bat only / bowl only" restrict who can be picked as a batsman or bowler during scoring?
8. **Bowler limits:** is there a maximum number of overs per bowler? Can the same bowler bowl consecutive overs? (The code only excludes the bowler of the previous over.)
9. **Hit wicket:** should it be in the dismissal menu? The types support it but the menu doesn't offer it.

### Data and access

10. ~~**Who can sign up?**~~ — **Decided 2026-11-19:** only addresses on the company email domain. Not enforced today; it needs a server-side check (Supabase Auth hook or trigger), since a client-side check can be bypassed. The exact domain(s) should be configured, not hard-coded in docs.
11. **Default role:** what role does a new account get, and how is a user made admin?
12. **Players vs users:** should each signed-in user be linked to a `players` row? Today the Profile tab guesses by name.
13. **Team delete:** the database already unassigns players and blocks deleting teams with saved matches. Is that the intended rule? Who may delete teams: any admin, or one named person (today's policy)?
14. **Who can score:** any admin, or only an admin assigned to that match?
15. **Football and Table Tennis:** what scoring rules and stats are expected (sets, points per game, deuce for TT; halves and extra time for football)?
16. **Super over:** how many balls and batsmen per side, who picks them, and what happens if the super over is also tied?
17. **App name:** "FAQ Sports", "FAQSports" or "Company Sports Portal"? All three appear today.
18. **Deleting players who have played:** the database deletes their rows from past scorecards. Should such players be blocked from deletion or soft-deleted (marked inactive) instead?
19. **LBW:** the database supports it as a dismissal; the app doesn't offer it. Add it?
20. **Cancelled vs abandoned:** the database calls it `abandoned`, the app `cancelled`. Which word?
21. **Signed-out access:** most data is readable without signing in. Should it require sign-in?

## 8. Undocumented assumptions found in code

| Assumption | Where |
|------------|-------|
| The team batting first is always stored as `teamA`. The create screen swaps teams so this holds, and the innings engine depends on it. | `CreateMatchScreen.tsx` `handleCreateMatch`, `inningsEngine.ts` |
| A cricket match has exactly two innings. | `CricketMatch.currentInnings: 1 \| 2` |
| An over is always 6 legal balls. | `scoreEngine.ts:70` |
| Every player belongs to at most one team. | `players.team_id` |
| The user's display name is the part of their email before `@`. | `login.tsx:52` |
| Email addresses are compared in lower case; `profiles.email` must also be lower case. | `login.tsx:41-44` |
| Grounds are referenced by name, not ID. (Names are unique in the database, but matches store `ground_id`.) | `getGrounds` returns names only |
| Substitutes come from players who are not in either of the two match teams (no team, or another team). | `availablePlayers` in cricket create |
| The stat shown for Badminton, Carrom and UNO will be "wins". | `index.tsx` `getPlayerStat` |
