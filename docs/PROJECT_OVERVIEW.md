# FAQ Sports — Project Overview

## 1. What it is

FAQ Sports is an internal mobile app for **FAQ employees** that acts as a sports activity management tool. It:

- stores player and team data,
- creates and schedules matches,
- runs live scoring and keeps each sport's scorecard,
- tracks player stats, ratings and recent form.

It is built with Expo (React Native), so the same code runs on **iOS, Android and web**. Supabase provides the backend (database and auth).

**Status:** existing application under active development.

## 2. Users and roles

Everyone signs in with email and password (Supabase Auth). Each user has a role, stored in the Supabase `profiles` table:

| Role | Can do |
|------|--------|
| **Player** | View matches, live scores, teams, player profiles, stats, leaderboards and notifications. |
| **Admin** | Everything a player can, plus the **Admin Tools**: create and edit matches, manage teams and players, manage stadiums/grounds, and run live scoring. |

The role, user name and selected sport are cached on the device, so the app opens straight into the user's last context.

## 3. Sports

| Sport | Status | What's built |
|-------|--------|--------------|
| **Cricket** | Implemented | Match creation, toss, playing XI and substitutes, full ball-by-ball live scoring, scorecards, player batting/bowling/fielding stats. |
| **Football** | Partly built | Match creation (format, duration, lineups, substitutes), data model for goals, assists, cards and substitutions. No live-scoring screen yet. |
| **Table Tennis** | Partly built | Match creation screen; wins/losses and points tracked in player stats. |
| **Badminton** | Planned | Shown on the home screen as "Coming Soon". |
| **Carrom** | Planned | Shown on the home screen as "Coming Soon". |
| **UNO** | Planned | Shown on the home screen as "Coming Soon". |

The home screen has a sport switcher. The selected sport changes which stats are highlighted (runs for cricket, goals for football, wins for the other sports).

## 4. Main screens

**Bottom tabs**

- **Home** — welcome card with role badge, sport switcher, live match, upcoming matches and top players.
- **Matches** — upcoming, live and completed matches.
- **Teams** — teams and their squads; admins can add and edit teams and players.
- **Profile** — the user's profile and stats, with an admin section for admins.
- **More** — sports list, features (Tournaments, Leaderboards, Notifications), help and support, and Admin Tools.

**Other screens**

- **Login** — sign in / sign up.
- **Create Match** (cricket), **Create Football Match**, **Create Table Tennis Match**.
- **Match Details** — scorecard and summary for one match.
- **Live Scoring** — cricket ball-by-ball scoring for admins.
- **Player Profile** — stats, ratings and last five performances.
- **Team Details** — squad and captain.
- **Manage Stadiums** — add and edit grounds.
- **Notifications**.

## 5. Cricket live scoring

Cricket is the most complete sport. The scorer can record:

- runs off the bat (0–6),
- extras: wide, no-ball, bye and leg-bye,
- wickets: bowled, caught, run out, stumped, hit wicket and retired,
- strike rotation, new bowler at the end of each over, and bowler changes,
- innings changes and the match result.

Each innings tracks totals, extras, batsman and bowler figures, the current over and the fall of wickets. Matches can be **long** or **short** format, with a configurable number of overs. Every ball is saved to Supabase (`ball_info` table), with optional commentary.

The scoring rules live in `sports/cricket/engines/` (`scoreEngine`, `wicketEngine` and `inningsEngine`), separate from the screen.

## 6. Data model

Supabase tables:

| Table | Holds |
|-------|-------|
| `profiles` | User profile and role (`admin` / `player`). |
| `teams` | Name, short name, colour, logo, captain. |
| `players` | Name, position, batting and bowling style, team, ratings. |
| `player_stats` | Career stats per player (cricket, football and win/loss fields). |
| `matches` | Match records. |
| `ball_info` | Ball-by-ball cricket events. |
| `grounds` | Stadiums and grounds, with optional location. |

Player stats cover:

- **Cricket:** matches, runs, balls, wickets, catches, run-outs, stumpings, highest score, best bowling, fifties, centuries, average, strike rate and economy.
- **Football:** goals, assists, saves, yellow and red cards.
- **Other sports:** wins, losses, points for and points against.

Players also have **ratings** (batting, bowling, fielding and overall) and a record of their last five performances.

The TypeScript types for all of these are in `types/`.

## 7. Technology

| Area | Choice |
|------|--------|
| App framework | React Native 0.81 + React 19 on Expo SDK 54 |
| Navigation | Expo Router (file-based routes in `app/`) |
| Language | TypeScript (strict) |
| Backend, database, auth | Supabase |
| State | React hooks in context providers (`@nkzw/create-context-hook`), TanStack React Query, AsyncStorage |
| Styling | `StyleSheet` per component, shared dark-theme colours in `constants/colors.tsx` |
| Icons | lucide-react-native |
| Testing | Jest (`jest-expo`) + React Native Testing Library |

Code for each sport lives in its own folder under `sports/` (`cricket/`, `football/`, `table-tennis/`), and shared code lives in `api/`, `context/` and `types/`. See `CLAUDE.md` for the full folder structure, commands and coding conventions.

## 8. Known gaps and next steps

- **Mock data:** some screens and contexts still read from `mocks/data.ts` (matches, notifications, and the grounds list on the football and table tennis create screens). These should move to Supabase.
- **Live scoring for other sports:** football and table tennis have create screens but no live scoring yet.
- **New sports:** Badminton, Carrom and UNO need create screens, scoring and stats.
- **Inconsistent "Coming soon" labels:** the More tab marks Football and Table Tennis as "Coming soon", but they can be selected on Home and have create screens.
- **Unfinished menu items:** Tournaments, Leaderboards, FAQ and Terms of Service are not wired up yet. Tournaments already has a data type.
- **Placeholder support email:** Contact Support uses `support@company.com`.
- **Tests:** there is only one test (home screen), and it currently cannot run: Jest's `transformIgnorePatterns` doesn't include `@nkzw/create-context-hook`, and the Supabase env vars aren't set for tests. The scoring engines would benefit most from unit tests.
