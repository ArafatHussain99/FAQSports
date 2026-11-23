/**
 * Table tennis scoring rules. Pure functions only: the whole match state is
 * derived by replaying the point log, so undo is just "drop the last point".
 *
 * Rules:
 * - A game is played to `pointsToWin`: 11 when service changes every 2 points,
 *   21 when it changes every 5 (`pointsToWinForServes`).
 * - Deuce at 10-10 (or 20-20): from there a side must win 2 points in a row
 *   (i.e. get a 2-point lead) to take the game.
 * - The match is won by the first side to win a majority of `bestOf` games.
 * - Service changes every `servesPerTurn` points (singles 2, doubles 5 by house rule).
 *   From deuce (10-10) service changes after every point.
 * - Doubles: the server always serves from the right. When a player finishes a
 *   service turn they swap sides with their teammate, and service passes to the
 *   player on the right of the other team. Order: A-right, B-right, A-partner,
 *   B-partner, ...
 * - Each new game, the side that served first in the previous game receives first.
 *   The scorer can change the server / positions before the first point of a game.
 */
import {
  TTGameScore,
  TTGameSetup,
  TTMatchConfig,
  TTMatchState,
  TTPoint,
  TTSide,
} from '../types';

export const otherSide = (side: TTSide): TTSide => (side === 'A' ? 'B' : 'A');

export const gamesNeededToWin = (bestOf: number) => Math.floor(bestOf / 2) + 1;

/** Game point by serves per turn: 2 serves -> games to 11, 5 serves -> games to 21. */
export const pointsToWinForServes = (servesPerTurn: number) => (servesPerTurn >= 5 ? 21 : 11);

export const isGameWon = (own: number, opponent: number, pointsToWin: number) =>
  own >= pointsToWin && own - opponent >= 2;

const teamOf = (config: TTMatchConfig, side: TTSide) => (side === 'A' ? config.teamA : config.teamB);

const partnerOf = (config: TTMatchConfig, side: TTSide, playerId: string): string | null => {
  const team = teamOf(config, side);
  if (team.length < 2) return null;
  return team.find(id => id !== playerId) ?? null;
};

/** Default setup for the first game: Team A serves, first listed player of each team on the right. */
export const defaultFirstSetup = (config: TTMatchConfig): TTGameSetup => ({
  firstServer: 'A',
  rightA: config.teamA[0],
  rightB: config.teamB[0],
});

/** Setup for `game`: the stored one, or the previous game's with the first server flipped. */
export const getGameSetup = (
  config: TTMatchConfig,
  setups: TTGameSetup[],
  game: number,
): TTGameSetup => {
  if (setups[game]) return setups[game];
  if (game === 0) return defaultFirstSetup(config);
  const previous = getGameSetup(config, setups, game - 1);
  return { ...previous, firstServer: otherSide(previous.firstServer) };
};

/** Returns a copy of `setups` with `setup` stored for `game` (earlier gaps filled with defaults). */
export const setGameSetup = (
  config: TTMatchConfig,
  setups: TTGameSetup[],
  game: number,
  setup: TTGameSetup,
): TTGameSetup[] => {
  const next: TTGameSetup[] = [];
  for (let g = 0; g < game; g++) next.push(getGameSetup(config, setups, g));
  next[game] = setup;
  return next;
};

/** Score of each game played so far, from the point log. */
export const computeGames = (config: TTMatchConfig, points: TTPoint[]): TTGameScore[] => {
  const games: TTGameScore[] = [];
  for (const point of points) {
    while (games.length <= point.game) games.push({ a: 0, b: 0, winner: null });
    const game = games[point.game];
    if (point.winner === 'A') game.a += 1;
    else game.b += 1;
    if (isGameWon(game.a, game.b, config.pointsToWin)) game.winner = 'A';
    else if (isGameWon(game.b, game.a, config.pointsToWin)) game.winner = 'B';
  }
  return games;
};

/** Who serves the next point of a game, given the score so far. */
export const computeService = (
  config: TTMatchConfig,
  setup: TTGameSetup,
  scoreA: number,
  scoreB: number,
) => {
  const played = scoreA + scoreB;
  const spt = Math.max(1, config.servesPerTurn);
  const deuceStart = 2 * (config.pointsToWin - 1);

  let turn: number;
  let servesLeft: number;
  if (played < deuceStart) {
    turn = Math.floor(played / spt);
    servesLeft = Math.min(spt - (played % spt), deuceStart - played);
  } else {
    turn = Math.ceil(deuceStart / spt) + (played - deuceStart);
    servesLeft = 1;
  }

  const firstServer = setup.firstServer;
  const servingSide: TTSide = turn % 2 === 0 ? firstServer : otherSide(firstServer);

  // Service turns each side has completed before this one. A doubles pair
  // swaps sides after each of its own service turns.
  const turnsDone: Record<TTSide, number> = {
    [firstServer]: Math.ceil(turn / 2),
    [otherSide(firstServer)]: Math.floor(turn / 2),
  } as Record<TTSide, number>;

  const positionFor = (side: TTSide) => {
    const startRight = side === 'A' ? setup.rightA : setup.rightB;
    const startLeft = partnerOf(config, side, startRight);
    if (!startLeft) return { right: startRight, left: null };
    return turnsDone[side] % 2 === 0
      ? { right: startRight, left: startLeft }
      : { right: startLeft, left: startRight };
  };

  const positions = { A: positionFor('A'), B: positionFor('B') };

  return {
    servingSide,
    serverId: positions[servingSide].right,
    receiverId: positions[otherSide(servingSide)].right,
    servesLeft,
    positions,
  };
};

/** Full match state from the config, the per-game setups and the point log. */
export const computeMatchState = (
  config: TTMatchConfig,
  setups: TTGameSetup[],
  points: TTPoint[],
): TTMatchState => {
  const games = computeGames(config, points);
  const needed = gamesNeededToWin(config.bestOf);

  let gamesWonA = 0;
  let gamesWonB = 0;
  for (const game of games) {
    if (game.winner === 'A') gamesWonA += 1;
    if (game.winner === 'B') gamesWonB += 1;
  }

  const matchWinner: TTSide | null =
    gamesWonA >= needed ? 'A' : gamesWonB >= needed ? 'B' : null;
  const matchOver = matchWinner !== null;

  const completedGames = games.filter(g => g.winner).length;
  const currentGame = matchOver ? Math.max(0, games.length - 1) : completedGames;
  const current = games[currentGame] ?? { a: 0, b: 0, winner: null };

  const setup = getGameSetup(config, setups, currentGame);
  const service = computeService(config, setup, current.a, current.b);
  const isDeuce = current.a >= config.pointsToWin - 1 && current.b >= config.pointsToWin - 1;
  const advantage: TTSide | null =
    isDeuce && !current.winner && current.a !== current.b ? (current.a > current.b ? 'A' : 'B') : null;

  return {
    games,
    currentGame,
    gamesWonA,
    gamesWonB,
    scoreA: current.a,
    scoreB: current.b,
    setup,
    positions: service.positions,
    servingSide: service.servingSide,
    serverId: service.serverId,
    receiverId: service.receiverId,
    servesLeft: service.servesLeft,
    isDeuce,
    advantage,
    gameJustEnded: !matchOver && currentGame > 0 && current.a + current.b === 0,
    matchOver,
    matchWinner,
  };
};

/** Adds a point for `winner`. Returns the points unchanged if the match is already over. */
export const addPoint = (
  config: TTMatchConfig,
  setups: TTGameSetup[],
  points: TTPoint[],
  winner: TTSide,
  at: string = new Date().toISOString(),
): TTPoint[] => {
  const state = computeMatchState(config, setups, points);
  if (state.matchOver) return points;
  return [...points, { game: state.currentGame, winner, serverId: state.serverId, at }];
};

/** Removes the last point (undo). */
export const undoPoint = (points: TTPoint[]): TTPoint[] => points.slice(0, -1);

/** Short result text, e.g. "Won 3-1". */
export const describeResult = (state: TTMatchState) =>
  `${Math.max(state.gamesWonA, state.gamesWonB)}-${Math.min(state.gamesWonA, state.gamesWonB)}`;
