import { buildCricketStatLines } from '@/sports/cricket/matchStats';
import { CricketMatch, CricketInnings } from '@/sports/cricket/types';

const TEAM_A = '11111111-1111-4111-8111-111111111111';
const TEAM_B = '22222222-2222-4222-8222-222222222222';
const A1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const A2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const B1 = 'bbbbbbbb-0000-4000-8000-000000000001';
const B2 = 'bbbbbbbb-0000-4000-8000-000000000002';

const innings = (over: Partial<CricketInnings>): CricketInnings => ({
  battingTeam: TEAM_A,
  bowlingTeam: TEAM_B,
  runs: 0,
  wickets: 0,
  overs: 0,
  balls: 0,
  extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
  batsmen: [],
  bowlers: [],
  allBalls: [],
  thisOver: [],
  fallOfWickets: [],
  ...over,
});

const match = (inningsList: CricketInnings[], xiA = [A1, A2], xiB = [B1, B2]): CricketMatch => ({
  id: 'match_1',
  sport: 'cricket',
  status: 'completed',
  matchType: 'short',
  totalOvers: 10,
  ground: 'Office Ground',
  teamA: TEAM_A,
  teamB: TEAM_B,
  tossWinner: TEAM_A,
  tossDecision: 'bat',
  playingXI_A: xiA,
  playingXI_B: xiB,
  substitutes_A: [],
  substitutes_B: [],
  currentInnings: 2,
  innings: inningsList,
  createdAt: '2026-11-24T00:00:00Z',
});

const bat = (playerId: string, runs: number, balls: number, extra: object = {}) => ({
  playerId, runs, balls, fours: 0, sixes: 0, strikeRate: 0, isOut: false, ...extra,
});

describe('buildCricketStatLines', () => {
  it('gives every playing XI member a line tagged with their team', () => {
    const lines = buildCricketStatLines(match([innings({})]));
    expect(lines).toHaveLength(4);
    expect(lines.find(l => l.player_id === A1)?.team_id).toBe(TEAM_A);
    expect(lines.find(l => l.player_id === B2)?.team_id).toBe(TEAM_B);
  });

  it('records batting, bowling and fielding from both innings', () => {
    const lines = buildCricketStatLines(match([
      innings({
        batsmen: [
          bat(A1, 54, 30, { fours: 6, sixes: 1, isOut: true, dismissalType: 'caught', caughtBy: B2 }),
          bat(A2, 12, 9),
        ],
        bowlers: [{ playerId: B1, overs: 2, balls: 3, maidens: 0, runs: 25, wickets: 1, economy: 0, wides: 0, noBalls: 0 }],
      }),
      innings({
        battingTeam: TEAM_B,
        bowlingTeam: TEAM_A,
        batsmen: [bat(B1, 7, 5, { isOut: true, dismissalType: 'stumped', stumpedBy: A2 })],
        bowlers: [{ playerId: A1, overs: 1, balls: 0, maidens: 0, runs: 8, wickets: 1, economy: 0, wides: 0, noBalls: 0 }],
      }),
    ]));

    const a1 = lines.find(l => l.player_id === A1)!;
    expect(a1).toMatchObject({ runs: 54, balls: 30, fours: 6, sixes: 1, batted: true, dismissed: true, wickets: 1, balls_bowled: 6, runs_conceded: 8 });
    expect(lines.find(l => l.player_id === B1)).toMatchObject({ balls_bowled: 15, runs_conceded: 25, wickets: 1, runs: 7 });
    expect(lines.find(l => l.player_id === B2)?.catches).toBe(1);
    expect(lines.find(l => l.player_id === A2)?.stumpings).toBe(1);
    expect(lines.find(l => l.player_id === A2)?.dismissed).toBe(false);
  });

  it('does not count a retired batter as dismissed', () => {
    const lines = buildCricketStatLines(match([
      innings({ batsmen: [bat(A1, 20, 15, { isOut: true, dismissalType: 'retired' })] }),
    ]));
    expect(lines.find(l => l.player_id === A1)).toMatchObject({ batted: true, dismissed: false, runs: 20 });
  });

  it('skips mock ids that the database would reject', () => {
    const lines = buildCricketStatLines(match([innings({})], ['p1', A1], [B1]));
    expect(lines.map(l => l.player_id)).toEqual([A1, B1]);
  });
});
