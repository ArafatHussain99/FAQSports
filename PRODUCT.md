# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- **Primary: the admin scorer at the ground.** An FAQ employee with the `admin` role scores a match live on a phone at the ground or office pitch, often outdoors, while the game is in play. They record every ball (runs, extras, wickets), pick batsmen and bowlers, and create matches, teams, players and grounds.
- **Secondary: players.** FAQ employees with the `player` role check live scores, results, standings and their own stats, mostly on their phones.

## Product Purpose

FAQ Sports is the internal sports-activity tool for FAQ employees. It stores player data, runs live scorecards and keeps match history for the sports played at FAQ. Success means a match can be scored ball by ball without mistakes or hesitation, and anyone can see the score and their stats afterwards.

## Positioning

Built for one company's own games: FAQ's teams, players, grounds and match formats (cricket long/short pitch), not a generic league app.

## Operating Context

- Live scoring happens one-handed on a phone during play, outdoors, with quick taps between balls.
- Sports: Cricket, Football and Table Tennis are implemented. Badminton, Carrom and UNO show "Coming Soon".
- Roles: `admin` (scores and manages data) and `player` (read-only views). Role is shown on Home and Profile.
- Data lives in Supabase; some screens still read mock data.

## Capabilities and Constraints

- Expo / React Native app shipped on iOS, Android and web (react-native-web).
- Admin-only actions (create match, live scoring, add/delete teams, players, grounds) must stay hidden from players.
- `Alert.alert` button flows don't work on web; known gap.

## Brand Commitments

- Product name is **FAQ Sports** everywhere (replaces "Company Sports Portal" on Login and More).

## Evidence on Hand

- Player cover images under `assets/images/player-covers/` (main checkout, uncommitted at time of writing).
- No logo or design file exists. No real support email yet (`support@company.com` is a placeholder).

## Product Principles

1. Scoring speed and accuracy come first: the scorer must never hunt for a control mid-over.
2. Readable at a glance, outdoors, at arm's length.
3. Admin power stays out of players' way.
4. Feel native on each phone OS.
