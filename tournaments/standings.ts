// League table, fixtures and knockout progression for tournaments.
// Pure functions, no React or Supabase: see __tests__/tournament-standings-test.ts.
//
// Rules (docs/BUSINESS_LOGIC.md §Tournaments, decided 2026-11-23):
//   Points       cricket: win 2, tie 1, no result 1 · football: win 3, draw 1 · table tennis: win 3
//   Order        cricket:      points → net run rate → head-to-head
//                football:     points → goal difference → head-to-head → goals scored
//                table tennis: points → head-to-head → game difference
//   Head-to-head is a mini-league of the matches between the level teams.
//   Anything still level is ordered by an admin (tieBreakRank), who is asked
//   when the tie decides who qualifies for the knockouts.

import {
  MatchOutcome,
  StandingRow,
  Standings,
  Tournament,
  TournamentMatch,
  TournamentSport,
  TournamentStage,
} from './types';

const EPSILON = 1e-9;

export const POINTS: Record<TournamentSport, { win: number; draw: number; noResult: number }> = {
  cricket: { win: 2, draw: 1, noResult: 1 },
  football: { win: 3, draw: 1, noResult: 1 },
  table_tennis: { win: 3, draw: 0, noResult: 0 },
};

// ---------------------------------------------------------------------------
// Cricket helpers
// ---------------------------------------------------------------------------

/** 111 → "18.3" */
export const ballsToOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

/** "18.3" → 111. Returns null for anything that isn't overs.balls with balls 0–5. */
export const oversToBalls = (text: string): number | null => {
  const match = /^\s*(\d+)(?:\.(\d))?\s*$/.exec(text);
  if (!match) return null;
  const overs = Number(match[1]);
  const balls = match[2] === undefined ? 0 : Number(match[2]);
  if (balls > 5) return null;
  return overs * 6 + balls;
};

/** A side is all out when one batter is left (players − 1 wickets), REQUIREMENTS §7 Q4. */
export const isAllOut = (wickets: number | null, playersPerSide: number | null) =>
  wickets !== null && wickets >= Math.max(1, (playersPerSide ?? 11) - 1);

/**
 * Balls that count for net run rate. Under the ICC rule a side bowled out
 * is treated as having faced its full quota of overs.
 */
export const nrrBalls = (
  balls: number | null,
  wickets: number | null,
  oversPerInnings: number | null,
  playersPerSide: number | null
) => {
  const quota = (oversPerInnings ?? 20) * 6;
  if (isAllOut(wickets, playersPerSide)) return quota;
  return balls ?? 0;
};

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export const winnerEntryId = (match: TournamentMatch): string | null => {
  if (match.status !== 'completed') return null;
  if (match.outcome === 'A') return match.entryAId;
  if (match.outcome === 'B') return match.entryBId;
  return null;
};

export const loserEntryId = (match: TournamentMatch): string | null => {
  if (match.status !== 'completed') return null;
  if (match.outcome === 'A') return match.entryBId;
  if (match.outcome === 'B') return match.entryAId;
  return null;
};

/** Higher score wins; level is a draw (a tie in cricket). */
export const outcomeFromScores = (scoreA: number, scoreB: number): MatchOutcome =>
  scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'draw';

const leagueMatches = (t: Pick<Tournament, 'matches'>) => t.matches.filter(m => m.stage === 'league');

export const isLeagueComplete = (t: Pick<Tournament, 'matches'>) => {
  const league = leagueMatches(t);
  return league.length > 0 && league.every(m => m.status === 'completed');
};

/** Round robin by the circle method: every entry plays every other once. Indexes are 0-based. */
export const roundRobinFixtures = (count: number): { a: number; b: number; round: number }[] => {
  if (count < 2) return [];
  const slots: number[] = Array.from({ length: count }, (_, i) => i);
  if (slots.length % 2 === 1) slots.push(-1); // bye
  const size = slots.length;
  const fixtures: { a: number; b: number; round: number }[] = [];

  for (let round = 0; round < size - 1; round++) {
    for (let i = 0; i < size / 2; i++) {
      const home = slots[i];
      const away = slots[size - 1 - i];
      if (home === -1 || away === -1) continue;
      // Alternate who is listed first so nobody is always "Team A".
      fixtures.push(round % 2 === 0 ? { a: home, b: away, round: round + 1 } : { a: away, b: home, round: round + 1 });
    }
    // Keep the first slot fixed, rotate the rest one place.
    slots.splice(1, 0, slots.pop() as number);
  }
  return fixtures;
};

// ---------------------------------------------------------------------------
// League table
// ---------------------------------------------------------------------------

type Totals = Omit<StandingRow, 'position' | 'net'>;

const emptyTotals = (entryId: string): Totals => ({
  entryId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  noResult: 0,
  points: 0,
  scored: 0,
  conceded: 0,
  runsFor: 0,
  ballsFaced: 0,
  runsAgainst: 0,
  ballsBowled: 0,
});

/** Adds one completed match to the totals of the entries in `totals`. */
const addMatch = (
  totals: Map<string, Totals>,
  match: TournamentMatch,
  t: Pick<Tournament, 'sport' | 'oversPerInnings' | 'playersPerSide'>
) => {
  if (match.status !== 'completed' || !match.outcome) return;
  const a = totals.get(match.entryAId);
  const b = totals.get(match.entryBId);
  const points = POINTS[t.sport];

  const apply = (row: Totals | undefined, side: 'A' | 'B') => {
    if (!row) return;
    row.played += 1;
    if (match.outcome === 'no_result') {
      row.noResult += 1;
      row.points += points.noResult;
      return; // no result doesn't count for scored/conceded or run rate
    }
    const mine = side === 'A' ? match.scoreA ?? 0 : match.scoreB ?? 0;
    const theirs = side === 'A' ? match.scoreB ?? 0 : match.scoreA ?? 0;
    row.scored += mine;
    row.conceded += theirs;

    if (match.outcome === 'draw') {
      row.drawn += 1;
      row.points += points.draw;
    } else if (match.outcome === side) {
      row.won += 1;
      row.points += points.win;
    } else {
      row.lost += 1;
    }

    if (t.sport === 'cricket') {
      const myWickets = side === 'A' ? match.wicketsA : match.wicketsB;
      const theirWickets = side === 'A' ? match.wicketsB : match.wicketsA;
      const myBalls = side === 'A' ? match.ballsA : match.ballsB;
      const theirBalls = side === 'A' ? match.ballsB : match.ballsA;
      row.runsFor += mine;
      row.runsAgainst += theirs;
      row.ballsFaced += nrrBalls(myBalls, myWickets, t.oversPerInnings, t.playersPerSide);
      row.ballsBowled += nrrBalls(theirBalls, theirWickets, t.oversPerInnings, t.playersPerSide);
    }
  };

  apply(a, 'A');
  apply(b, 'B');
};

/** (runs scored ÷ overs faced) − (runs conceded ÷ overs bowled). */
export const netRunRate = (row: Pick<Totals, 'runsFor' | 'ballsFaced' | 'runsAgainst' | 'ballsBowled'>) => {
  const forRate = row.ballsFaced > 0 ? row.runsFor / (row.ballsFaced / 6) : 0;
  const againstRate = row.ballsBowled > 0 ? row.runsAgainst / (row.ballsBowled / 6) : 0;
  return forRate - againstRate;
};

const netFor = (sport: TournamentSport, row: Totals) =>
  sport === 'cricket' ? netRunRate(row) : row.scored - row.conceded;

/** Higher value = higher in the table. */
type Criterion = (ids: string[]) => Map<string, number>;

/** Splits `ids` into ordered groups that every criterion leaves level. */
const orderBy = (ids: string[], criteria: Criterion[]): string[][] => {
  if (ids.length <= 1 || criteria.length === 0) return [ids];
  const values = criteria[0](ids);
  const sorted = [...ids].sort((x, y) => (values.get(y) ?? 0) - (values.get(x) ?? 0));
  const groups: string[][] = [];
  for (const id of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs((values.get(last[0]) ?? 0) - (values.get(id) ?? 0)) < EPSILON) {
      last.push(id);
    } else {
      groups.push([id]);
    }
  }
  return groups.flatMap(group => orderBy(group, criteria.slice(1)));
};

export const computeStandings = (t: Tournament): Standings => {
  const totals = new Map<string, Totals>();
  t.entries.forEach(e => totals.set(e.id, emptyTotals(e.id)));
  const league = leagueMatches(t);
  league.forEach(m => addMatch(totals, m, t));

  const byKey = (key: (row: Totals) => number): Criterion => ids =>
    new Map(ids.map(id => [id, key(totals.get(id) as Totals)]));

  /** Points from the matches played between the entries in `ids` only. */
  const headToHead: Criterion = ids => {
    const mini = new Map<string, Totals>(ids.map(id => [id, emptyTotals(id)]));
    league
      .filter(m => mini.has(m.entryAId) && mini.has(m.entryBId))
      .forEach(m => addMatch(mini, m, t));
    return new Map(ids.map(id => [id, (mini.get(id) as Totals).points]));
  };

  const points = byKey(row => row.points);
  const net = byKey(row => netFor(t.sport, row));
  const criteria: Criterion[] =
    t.sport === 'cricket'
      ? [points, net, headToHead]
      : t.sport === 'football'
        ? [points, net, headToHead, byKey(row => row.scored)]
        : [points, headToHead, net];

  const entryById = new Map(t.entries.map(e => [e.id, e]));
  const seedOf = (id: string) => entryById.get(id)?.seed ?? 0;
  const ids = [...t.entries].sort((x, y) => x.seed - y.seed).map(e => e.id);

  const unresolvedTies: string[][] = [];
  const ordered = orderBy(ids, criteria).flatMap(group => {
    if (group.length === 1) return group;
    const allRanked = group.every(id => entryById.get(id)?.tieBreakRank != null);
    if (!allRanked) unresolvedTies.push(group);
    return [...group].sort((x, y) => {
      const rx = entryById.get(x)?.tieBreakRank ?? Number.MAX_SAFE_INTEGER;
      const ry = entryById.get(y)?.tieBreakRank ?? Number.MAX_SAFE_INTEGER;
      return rx - ry || seedOf(x) - seedOf(y);
    });
  });

  const rows: StandingRow[] = ordered.map((id, index) => {
    const row = totals.get(id) as Totals;
    return { ...row, position: index + 1, net: netFor(t.sport, row) };
  });

  return { rows, unresolvedTies };
};

/**
 * A level group (that only an admin can order) that straddles the knockout
 * cut-off, e.g. three teams level for 2nd–4th when two qualify.
 * `slots` is how many of the group go through.
 */
export const qualificationTie = (
  t: Pick<Tournament, 'qualifiers'>,
  standings: Standings
): { entryIds: string[]; slots: number } | null => {
  const q = t.qualifiers;
  if (q === 0) return null;
  for (const group of standings.unresolvedTies) {
    const positions = group.map(id => standings.rows.find(r => r.entryId === id)?.position ?? 0);
    const top = Math.min(...positions);
    const bottom = Math.max(...positions);
    if (top <= q && bottom > q) return { entryIds: group, slots: q - top + 1 };
  }
  return null;
};

/** Same check for a league-only tournament: who is champion. */
export const firstPlaceTie = (standings: Standings): string[] | null => {
  const group = standings.unresolvedTies.find(g =>
    g.some(id => standings.rows.find(r => r.entryId === id)?.position === 1)
  );
  return group ?? null;
};

// ---------------------------------------------------------------------------
// Knockouts
// ---------------------------------------------------------------------------

export type NextStage = { stage: TournamentStage; pairs: [string, string][] };

/**
 * The knockout matches an admin can create now, or null.
 * Semi-finals: 1st v 4th, 2nd v 3rd. Final: the semi-final winners, or 1st v 2nd.
 */
export const nextKnockoutStage = (t: Tournament, standings: Standings): NextStage | null => {
  if (t.status !== 'live' || t.qualifiers === 0) return null;
  if (!isLeagueComplete(t) || qualificationTie(t, standings)) return null;

  const semis = t.matches.filter(m => m.stage === 'semi');
  const finals = t.matches.filter(m => m.stage === 'final');
  if (finals.length > 0) return null;

  const at = (position: number) => standings.rows[position - 1]?.entryId;

  if (t.qualifiers === 4) {
    if (semis.length === 0) {
      if (standings.rows.length < 4) return null;
      return { stage: 'semi', pairs: [[at(1), at(4)], [at(2), at(3)]] };
    }
    const winners = semis.map(winnerEntryId);
    if (semis.length === 2 && winners.every(Boolean)) {
      return { stage: 'final', pairs: [[winners[0] as string, winners[1] as string]] };
    }
    return null;
  }

  if (standings.rows.length < 2) return null;
  return { stage: 'final', pairs: [[at(1), at(2)]] };
};

/** Champion and runner-up once the tournament can be finished, otherwise null. */
export const tournamentPlacings = (
  t: Tournament,
  standings: Standings
): { winner: string; runnerUp: string | null } | null => {
  if (t.qualifiers > 0) {
    const final = t.matches.find(m => m.stage === 'final');
    const winner = final ? winnerEntryId(final) : null;
    return final && winner ? { winner, runnerUp: loserEntryId(final) } : null;
  }
  if (!isLeagueComplete(t) || firstPlaceTie(standings)) return null;
  return { winner: standings.rows[0].entryId, runnerUp: standings.rows[1]?.entryId ?? null };
};

/** "Round 3", "Semi-final", "Final". */
export const stageLabel = (match: Pick<TournamentMatch, 'stage' | 'round'>) =>
  match.stage === 'final' ? 'Final' : match.stage === 'semi' ? 'Semi-final' : `Round ${match.round}`;
