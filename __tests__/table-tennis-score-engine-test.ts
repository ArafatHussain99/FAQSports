import {
  addPoint,
  computeMatchState,
  pointsToWinForServes,
  setGameSetup,
  undoPoint,
} from '@/sports/table-tennis/engines/scoreEngine';
import { TTGameSetup, TTMatchConfig, TTPoint, TTSide } from '@/sports/table-tennis/types';

const singles: TTMatchConfig = {
  format: 'single',
  bestOf: 3,
  pointsToWin: 11,
  servesPerTurn: 2,
  teamA: ['a1'],
  teamB: ['b1'],
};

const doubles: TTMatchConfig = {
  format: 'double',
  bestOf: 3,
  pointsToWin: 21,
  servesPerTurn: 5,
  teamA: ['a1', 'a2'],
  teamB: ['b1', 'b2'],
};

const play = (config: TTMatchConfig, setups: TTGameSetup[], winners: TTSide[], start: TTPoint[] = []) =>
  winners.reduce((points, w) => addPoint(config, setups, points, w, 't'), start);

const repeat = (side: TTSide, n: number): TTSide[] => Array(n).fill(side);

describe('table tennis score engine', () => {
  it('changes singles service every 2 points', () => {
    const servers: string[] = [];
    let points: TTPoint[] = [];
    for (let i = 0; i < 6; i++) {
      servers.push(computeMatchState(singles, [], points).serverId);
      points = addPoint(singles, [], points, 'A', 't');
    }
    expect(servers).toEqual(['a1', 'a1', 'b1', 'b1', 'a1', 'a1']);
  });

  it('rotates doubles service every 5 points with side swaps', () => {
    const setups = [{ firstServer: 'A' as TTSide, rightA: 'a1', rightB: 'b1' }];
    const turnServers: string[] = [];
    let points: TTPoint[] = [];
    // Alternate winners so the game doesn't end within 20 points.
    for (let i = 0; i < 20; i++) {
      const state = computeMatchState(doubles, setups, points);
      if (i % 5 === 0) turnServers.push(state.serverId);
      points = addPoint(doubles, setups, points, i % 2 === 0 ? 'A' : 'B', 't');
    }
    // A1 serves, swaps with A2; B1 (B's right) serves, swaps with B2; then A2, then B2.
    expect(turnServers).toEqual(['a1', 'b1', 'a2', 'b2']);
  });

  it('puts the right players opposite each other and swaps after a service turn', () => {
    const setups = [{ firstServer: 'A' as TTSide, rightA: 'a1', rightB: 'b2' }];
    let state = computeMatchState(doubles, setups, []);
    expect(state.serverId).toBe('a1');
    expect(state.receiverId).toBe('b2');
    expect(state.servesLeft).toBe(5);

    const points = play(doubles, setups, repeat('A', 5));
    state = computeMatchState(doubles, setups, points);
    expect(state.positions.A).toEqual({ right: 'a2', left: 'a1' });
    expect(state.serverId).toBe('b2');
    expect(state.receiverId).toBe('a2');
  });

  it('changes service every point from deuce and needs a 2-point lead', () => {
    const winners: TTSide[] = [];
    for (let i = 0; i < 10; i++) winners.push('A', 'B');
    let points = play(singles, [], winners); // 10-10
    let state = computeMatchState(singles, [], points);
    expect(state.isDeuce).toBe(true);
    expect(state.servesLeft).toBe(1);
    const firstDeuceServer = state.serverId;

    points = addPoint(singles, [], points, 'A', 't'); // 11-10
    state = computeMatchState(singles, [], points);
    expect(state.games[0].winner).toBeNull();
    expect(state.serverId).not.toBe(firstDeuceServer);

    points = addPoint(singles, [], points, 'A', 't'); // 12-10
    state = computeMatchState(singles, [], points);
    expect(state.games[0]).toEqual({ a: 12, b: 10, winner: 'A' });
    expect(state.currentGame).toBe(1);
  });

  it('flips the first server each game and ends the match on a majority', () => {
    let points = play(singles, [], repeat('A', 11));
    let state = computeMatchState(singles, [], points);
    expect(state.currentGame).toBe(1);
    expect(state.gameJustEnded).toBe(true);
    expect(state.serverId).toBe('b1');

    points = play(singles, [], repeat('A', 11), points);
    state = computeMatchState(singles, [], points);
    expect(state.matchOver).toBe(true);
    expect(state.matchWinner).toBe('A');
    expect(state.gamesWonA).toBe(2);
    // No more points once the match is over.
    expect(addPoint(singles, [], points, 'B', 't')).toBe(points);
  });

  it('undo goes back into the previous game', () => {
    const points = play(singles, [], repeat('B', 11));
    const state = computeMatchState(singles, [], undoPoint(points));
    expect(state.currentGame).toBe(0);
    expect(state.scoreB).toBe(10);
  });

  it('uses a stored setup for later games', () => {
    const setups = setGameSetup(doubles, [], 1, { firstServer: 'A', rightA: 'a2', rightB: 'b1' });
    expect(setups[0]).toEqual({ firstServer: 'A', rightA: 'a1', rightB: 'b1' });
    const points = play(doubles, setups, repeat('B', 21));
    const state = computeMatchState(doubles, setups, points);
    expect(state.currentGame).toBe(1);
    expect(state.serverId).toBe('a2');
  });

  it('plays to 11 with 2 serves and to 21 with 5 serves', () => {
    expect(pointsToWinForServes(2)).toBe(11);
    expect(pointsToWinForServes(5)).toBe(21);
  });

  it('21-point games: deuce at 20-20, then 2 points in a row win', () => {
    const winners: TTSide[] = [];
    for (let i = 0; i < 20; i++) winners.push('A', 'B');
    let points = play(doubles, [], winners); // 20-20
    let state = computeMatchState(doubles, [], points);
    expect(state.isDeuce).toBe(true);
    expect(state.advantage).toBeNull();
    expect(state.servesLeft).toBe(1);

    points = play(doubles, [], ['A'], points); // 21-20
    state = computeMatchState(doubles, [], points);
    expect(state.advantage).toBe('A');
    expect(state.games[0].winner).toBeNull();

    points = play(doubles, [], ['B'], points); // 21-21, back to deuce
    state = computeMatchState(doubles, [], points);
    expect(state.advantage).toBeNull();
    expect(state.games[0].winner).toBeNull();

    points = play(doubles, [], ['B', 'B'], points); // 21-23
    state = computeMatchState(doubles, [], points);
    expect(state.games[0]).toEqual({ a: 21, b: 23, winner: 'B' });
  });

  it('a 21-point game is won at 21-19 when there was no deuce', () => {
    const points = play(doubles, [], [...repeat('A', 20), ...repeat('B', 19), 'A']);
    expect(computeMatchState(doubles, [], points).games[0]).toEqual({ a: 21, b: 19, winner: 'A' });
  });

  it('best of 1 ends the match after one game', () => {
    const oneGame: TTMatchConfig = { ...singles, bestOf: 1 };
    const state = computeMatchState(oneGame, [], play(oneGame, [], repeat('B', 11)));
    expect(state.matchOver).toBe(true);
    expect(state.matchWinner).toBe('B');
  });
});
