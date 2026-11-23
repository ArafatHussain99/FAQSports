import type { MatchStatLine } from '@/api/statsApi';
import { CricketMatch } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: string | undefined | null): id is string => !!id && UUID.test(id);

/**
 * Turns a finished cricket match into one stat line per player, tagged with
 * the team they played for. Used at match end; the database rolls the lines
 * up into player_stats and raises records (highest score, best bowling).
 *
 * Players and teams without a database id (mock data) are skipped.
 * A retired batter has batted but is not counted as dismissed.
 */
export function buildCricketStatLines(match: CricketMatch): MatchStatLine[] {
  const lines = new Map<string, MatchStatLine>();

  const lineFor = (playerId: string, teamId: string): MatchStatLine | null => {
    if (!isUuid(playerId)) return null;
    let line = lines.get(playerId);
    if (!line) {
      line = { player_id: playerId, team_id: isUuid(teamId) ? teamId : null };
      lines.set(playerId, line);
    }
    return line;
  };

  // Everyone in the playing XI played the match, even without batting or bowling.
  match.playingXI_A.forEach((id) => lineFor(id, match.teamA));
  match.playingXI_B.forEach((id) => lineFor(id, match.teamB));

  for (const innings of match.innings) {
    for (const b of innings.batsmen) {
      const line = lineFor(b.playerId, innings.battingTeam);
      if (line) {
        line.runs = (line.runs ?? 0) + b.runs;
        line.balls = (line.balls ?? 0) + b.balls;
        line.fours = (line.fours ?? 0) + b.fours;
        line.sixes = (line.sixes ?? 0) + b.sixes;
        line.batted = true;
        line.dismissed = !!line.dismissed || (b.isOut && b.dismissalType !== 'retired');
      }

      // Fielding credit goes to the fielder, who is on the bowling side.
      const credit = (fielderId: string | undefined, key: 'catches' | 'run_outs' | 'stumpings') => {
        if (!fielderId) return;
        const fielder = lineFor(fielderId, innings.bowlingTeam);
        if (fielder) fielder[key] = (fielder[key] ?? 0) + 1;
      };
      if (b.isOut) {
        if (b.dismissalType === 'caught') credit(b.caughtBy, 'catches');
        if (b.dismissalType === 'run_out') credit(b.runoutBy, 'run_outs');
        if (b.dismissalType === 'stumped') credit(b.stumpedBy, 'stumpings');
      }
    }

    for (const bowler of innings.bowlers) {
      const line = lineFor(bowler.playerId, innings.bowlingTeam);
      if (line) {
        line.wickets = (line.wickets ?? 0) + bowler.wickets;
        line.balls_bowled = (line.balls_bowled ?? 0) + bowler.overs * 6 + bowler.balls;
        line.runs_conceded = (line.runs_conceded ?? 0) + bowler.runs;
      }
    }
  }

  return [...lines.values()];
}

/** The database dedupes by match id; cricket matches aren't stored yet, so use the app id. */
export const cricketMatchKey = (match: CricketMatch) => match.id;
