import {
  ballsToOvers,
  computeStandings,
  netRunRate,
  nextKnockoutStage,
  oversToBalls,
  qualificationTie,
  roundRobinFixtures,
  tournamentPlacings,
} from '@/tournaments/standings';
import { MatchOutcome, Tournament, TournamentMatch, TournamentSport } from '@/tournaments/types';

let matchSeq = 0;

const match = (
  a: string,
  b: string,
  scoreA: number,
  scoreB: number,
  extra: Partial<TournamentMatch> = {}
): TournamentMatch => ({
  id: `m${++matchSeq}`,
  tournamentId: 't',
  stage: 'league',
  round: 1,
  entryAId: a,
  entryBId: b,
  status: 'completed',
  scoreA,
  scoreB,
  wicketsA: null,
  wicketsB: null,
  ballsA: null,
  ballsB: null,
  outcome: (scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'draw') as MatchOutcome,
  completedAt: null,
  ...extra,
});

const tournament = (
  sport: TournamentSport,
  ids: string[],
  matches: TournamentMatch[],
  extra: Partial<Tournament> = {}
): Tournament => ({
  id: 't',
  name: 'Test',
  sport,
  format: sport === 'table_tennis' ? 'single' : null,
  oversPerInnings: sport === 'cricket' ? 20 : null,
  playersPerSide: sport === 'cricket' ? 11 : null,
  qualifiers: 0,
  status: 'live',
  startDate: null,
  endDate: null,
  winnerEntryId: null,
  createdAt: '',
  entries: ids.map((id, i) => ({
    id,
    tournamentId: 't',
    teamId: null,
    name: id,
    playerIds: [],
    seed: i + 1,
    tieBreakRank: null,
  })),
  matches,
  ...extra,
});

const order = (t: Tournament) => computeStandings(t).rows.map(r => r.entryId);

describe('round robin fixtures', () => {
  it.each([2, 3, 4, 5, 6, 7])('every pair plays exactly once with %i entries', n => {
    const fixtures = roundRobinFixtures(n);
    expect(fixtures).toHaveLength((n * (n - 1)) / 2);
    const pairs = new Set(fixtures.map(f => [f.a, f.b].sort().join('-')));
    expect(pairs.size).toBe(fixtures.length);
    // nobody plays twice in one round
    const rounds = new Map<number, number[]>();
    fixtures.forEach(f => rounds.set(f.round, [...(rounds.get(f.round) ?? []), f.a, f.b]));
    rounds.forEach(players => expect(new Set(players).size).toBe(players.length));
  });
});

describe('overs', () => {
  it('converts balls and overs', () => {
    expect(ballsToOvers(111)).toBe('18.3');
    expect(oversToBalls('18.3')).toBe(111);
    expect(oversToBalls('20')).toBe(120);
    expect(oversToBalls('18.6')).toBeNull();
    expect(oversToBalls('abc')).toBeNull();
  });
});

describe('football', () => {
  it('orders by points, then goal difference', () => {
    const t = tournament('football', ['A', 'B', 'C'], [
      match('A', 'B', 1, 0),
      match('C', 'A', 1, 0),
      match('B', 'C', 5, 0),
    ]);
    // all on 3 points; GD: A 0, B +4, C -4
    expect(order(t)).toEqual(['B', 'A', 'C']);
  });

  it('uses head-to-head when points and goal difference are level', () => {
    const t = tournament('football', ['B', 'A', 'C', 'D'], [
      match('A', 'B', 1, 0),
      match('A', 'C', 0, 2),
      match('A', 'D', 2, 0),
      match('B', 'C', 1, 0),
      match('B', 'D', 1, 0),
      match('C', 'D', 0, 0),
    ]);
    // A and B: 6 points, goal difference +1 each; A beat B
    expect(order(t).slice(0, 2)).toEqual(['A', 'B']);
  });

  it('reports a tie no rule can split', () => {
    // Played twice, one win each: same points, goal difference, head-to-head and goals
    const level = tournament('football', ['A', 'B'], [match('B', 'A', 1, 0), match('A', 'B', 1, 0)]);
    expect(computeStandings(level).unresolvedTies).toEqual([['A', 'B']]);
  });
});

describe('cricket net run rate', () => {
  it('counts an all-out side as facing its full overs', () => {
    // A 150/10 in 15.0 overs, B 151/3 in 18.0 overs. B wins.
    const t = tournament('cricket', ['A', 'B'], [
      match('A', 'B', 150, 151, { wicketsA: 10, ballsA: 90, wicketsB: 3, ballsB: 108 }),
    ]);
    const rows = computeStandings(t).rows;
    const b = rows.find(r => r.entryId === 'B')!;
    const a = rows.find(r => r.entryId === 'A')!;
    expect(b.points).toBe(2);
    // B: 151/18 - 150/20 ; A faced 20 overs because all out
    expect(b.net).toBeCloseTo(151 / 18 - 150 / 20, 6);
    expect(a.net).toBeCloseTo(150 / 20 - 151 / 18, 6);
    expect(a.ballsFaced).toBe(120);
  });

  it('gives a tie and a no result one point each and skips no result for NRR', () => {
    const t = tournament('cricket', ['A', 'B'], [
      match('A', 'B', 100, 100, { ballsA: 120, ballsB: 120, wicketsA: 5, wicketsB: 5 }),
      match('A', 'B', 0, 0, { outcome: 'no_result' }),
    ]);
    const rows = computeStandings(t).rows;
    rows.forEach(r => expect(r.points).toBe(2));
    expect(netRunRate(rows[0])).toBeCloseTo(0, 6);
  });
});

describe('table tennis', () => {
  it('3 points per win and head-to-head before game difference', () => {
    const t = tournament('table_tennis', ['A', 'B', 'C', 'D'], [
      match('A', 'B', 3, 2), // A beats B narrowly
      match('B', 'C', 3, 0),
      match('C', 'A', 3, 0),
      match('A', 'D', 3, 2),
      match('B', 'D', 3, 0),
      match('D', 'C', 3, 2),
    ]);
    // A: 2 wins (6), B: 2 wins (6), C: 1 win, D: 1 win
    // B has better game difference, but A beat B -> A first
    const result = order(t);
    expect(result.slice(0, 2)).toEqual(['A', 'B']);
    const rows = computeStandings(t).rows;
    expect(rows[0].points).toBe(6);
  });

  it('flags a three-way tie at the qualification cut-off and lets an admin order it', () => {
    // A, B, C each beat one of the others 3-0: fully level, D loses all
    const matches = [
      match('A', 'B', 3, 0),
      match('B', 'C', 3, 0),
      match('C', 'A', 3, 0),
      match('A', 'D', 3, 0),
      match('B', 'D', 3, 0),
      match('C', 'D', 3, 0),
    ];
    const t = tournament('table_tennis', ['A', 'B', 'C', 'D'], matches, { qualifiers: 2 });
    const standings = computeStandings(t);
    expect(qualificationTie(t, standings)).toEqual({ entryIds: ['A', 'B', 'C'], slots: 2 });
    expect(nextKnockoutStage(t, standings)).toBeNull();

    // Admin picks C and A to go through
    const ranked: Tournament = {
      ...t,
      entries: t.entries.map(e => ({ ...e, tieBreakRank: e.id === 'B' ? 2 : e.id === 'D' ? null : 1 })),
    };
    const after = computeStandings(ranked);
    expect(qualificationTie(ranked, after)).toBeNull();
    expect(after.rows.slice(0, 2).map(r => r.entryId).sort()).toEqual(['A', 'C']);
    expect(nextKnockoutStage(ranked, after)).toEqual({ stage: 'final', pairs: [['A', 'C']] });
  });
});

describe('knockouts', () => {
  it('semi-finals 1v4 and 2v3, then the final, then placings', () => {
    const ids = ['A', 'B', 'C', 'D'];
    const league = [
      match('A', 'B', 2, 0), match('A', 'C', 2, 0), match('A', 'D', 2, 0),
      match('B', 'C', 2, 0), match('B', 'D', 2, 0), match('C', 'D', 2, 0),
    ];
    let t = tournament('football', ids, league, { qualifiers: 4 });
    expect(nextKnockoutStage(t, computeStandings(t))).toEqual({ stage: 'semi', pairs: [['A', 'D'], ['B', 'C']] });

    t = { ...t, matches: [...league, match('A', 'D', 0, 1, { stage: 'semi' }), match('B', 'C', 1, 0, { stage: 'semi' })] };
    expect(nextKnockoutStage(t, computeStandings(t))).toEqual({ stage: 'final', pairs: [['D', 'B']] });

    t = { ...t, matches: [...t.matches, match('D', 'B', 2, 3, { stage: 'final' })] };
    expect(nextKnockoutStage(t, computeStandings(t))).toBeNull();
    expect(tournamentPlacings(t, computeStandings(t))).toEqual({ winner: 'B', runnerUp: 'D' });
  });

  it('league only: champion is top of the table once every match is played', () => {
    const t = tournament('football', ['A', 'B'], [match('A', 'B', 0, 1, { status: 'upcoming', outcome: null })]);
    expect(tournamentPlacings(t, computeStandings(t))).toBeNull();
    const done = { ...t, matches: [match('A', 'B', 0, 1)] };
    expect(tournamentPlacings(done, computeStandings(done))).toEqual({ winner: 'B', runnerUp: 'A' });
  });
});
