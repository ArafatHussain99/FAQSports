import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BallEvent, CricketMatch } from '@/types';

export const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

export interface ScoreEngineParams {
  currentMatch: CricketMatch | null;
  updateLiveMatch: (match: CricketMatch) => void;
  setLiveMatch: (match: CricketMatch) => void;
  getTeamById: (id: string) => any;
  getPlayerById: (id: string) => any;
  handleInningsEnd: (match: CricketMatch, battingTeamName: string | undefined) => void;
  selectNewBowler: (ctx: any) => void;
  setLastBalls: (fn: (prev: BallEvent[]) => BallEvent[]) => void;
}

export interface ExtraHandleParams {
  showActionSheetWithOptions: (config: any, callback: (index?: number) => void) => void;
  handleScore: (runs: number, extraType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye') => void;
  setExtraType: (type: 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null) => void;
  setShowExtraRunsInput: (visible: boolean) => void;
}

export const handleScore = (
  runs: number,
  extraType: 'wide' | 'no_ball' | 'bye' | 'leg_bye' | undefined,
  params: ScoreEngineParams
) => {
  const { currentMatch, updateLiveMatch, setLiveMatch, getTeamById, getPlayerById, handleInningsEnd, selectNewBowler, setLastBalls } = params;

  const match = currentMatch;
  if (!match) return;

  triggerHaptic();

  const updatedMatch = { ...match };
  const innings = { ...updatedMatch.innings[updatedMatch.currentInnings - 1] };
  const battingTeam = getTeamById(innings.battingTeam);

  const isLegalBall = !extraType;
  let totalRuns = runs;

  if (extraType === 'wide' || extraType === 'no_ball') {
    totalRuns = runs + 1;
  }

  innings.runs += totalRuns;

  if (extraType === 'wide') {
    innings.extras.wides += 1;
    innings.extras.total += 1 + runs;
  } else if (extraType === 'no_ball') {
    innings.extras.noBalls += 1;
    innings.extras.total += 1;
  } else if (extraType === 'bye') {
    innings.extras.byes += runs;
    innings.extras.total += runs;
  } else if (extraType === 'leg_bye') {
    innings.extras.legByes += runs;
    innings.extras.total += runs;
  }

  if (isLegalBall) {
    innings.balls += 1;
    if (innings.balls === 6) {
      innings.overs += 1;
      innings.balls = 0;

      setTimeout(() => {
        selectNewBowler({
          innings,
          updatedMatch,
          bowlingPlayers: updatedMatch.currentInnings === 1
            ? updatedMatch.playingXI_B.map((p: string) => {
              return getPlayerById(p); // This will be populated by getPlayerById in the component
            })
            : updatedMatch.playingXI_A.map((p: string) => {
              return getPlayerById(p);
            }),
        });
      }, 300);
    }
  }

  const updatedBatsmen = [...innings.batsmen];
  const strikerIndex = updatedBatsmen.findIndex(b => b.playerId === innings.currentStriker);

  if (strikerIndex >= 0 && (isLegalBall || extraType === 'no_ball')) {
    updatedBatsmen[strikerIndex] = {
      ...updatedBatsmen[strikerIndex],
      runs: updatedBatsmen[strikerIndex].runs + runs,
      balls: updatedBatsmen[strikerIndex].balls + (isLegalBall ? 1 : 0),
      fours: updatedBatsmen[strikerIndex].fours + (runs === 4 ? 1 : 0),
      sixes: updatedBatsmen[strikerIndex].sixes + (runs === 6 ? 1 : 0),
      dismissalType: undefined,
      strikeRate:
        ((updatedBatsmen[strikerIndex].runs + runs) / (updatedBatsmen[strikerIndex].balls + (isLegalBall ? 1 : 0))) * 100,
    };
  } else if (strikerIndex < 0 && innings.currentStriker) {
    updatedBatsmen.push({
      playerId: innings.currentStriker,
      runs,
      balls: isLegalBall ? 1 : 0,
      fours: runs === 4 ? 1 : 0,
      sixes: runs === 6 ? 1 : 0,
      strikeRate: runs * 100,
      isOut: false,
    });
  }

  innings.batsmen = updatedBatsmen;

  const updatedBowlers = [...innings.bowlers];
  const bowlerIndex = updatedBowlers.findIndex(b => b.playerId === innings.currentBowler);

  if (bowlerIndex >= 0) {
    const newBalls = updatedBowlers[bowlerIndex].balls + (isLegalBall ? 1 : 0);
    const newOvers = updatedBowlers[bowlerIndex].overs + Math.floor(newBalls / 6);
    updatedBowlers[bowlerIndex] = {
      ...updatedBowlers[bowlerIndex],
      balls: newBalls % 6,
      overs: newOvers,
      runs: updatedBowlers[bowlerIndex].runs + totalRuns,
      wides: updatedBowlers[bowlerIndex].wides + (extraType === 'wide' ? 1 : 0),
      noBalls: updatedBowlers[bowlerIndex].noBalls + (extraType === 'no_ball' ? 1 : 0),
      economy: (updatedBowlers[bowlerIndex].runs + totalRuns) / ((newOvers + newBalls / 6) || 1),
    };
  } else if (innings.currentBowler) {
    updatedBowlers.push({
      playerId: innings.currentBowler,
      overs: 0,
      balls: isLegalBall ? 1 : 0,
      maidens: 0,
      runs: totalRuns,
      wickets: 0,
      economy: totalRuns,
      wides: extraType === 'wide' ? 1 : 0,
      noBalls: extraType === 'no_ball' ? 1 : 0,
    });
  }

  innings.bowlers = updatedBowlers;

  if (runs % 2 === 1 || (innings.balls === 0 && isLegalBall)) {
    const temp = innings.currentStriker;
    innings.currentStriker = innings.currentNonStriker;
    innings.currentNonStriker = temp;
  }

  const ballEvent: BallEvent = {
    id: `ball_${Date.now()}`,
    over: innings.overs,
    ball: innings.balls || 6,
    bowlerId: innings.currentBowler || '',
    strikerId: match.innings[match.currentInnings - 1].currentStriker || '',
    nonStrikerId: match.innings[match.currentInnings - 1].currentNonStriker || '',
    runs,
    extras: extraType ? 1 : 0,
    extraType,
    isWicket: false,
    timestamp: new Date().toISOString(),
  };

  innings.allBalls = [...innings.allBalls, ballEvent];
  setLastBalls(prev => [...prev.slice(-5), ballEvent]);

  updatedMatch.innings[updatedMatch.currentInnings - 1] = innings;

  if (innings.overs >= match.totalOvers) {
    handleInningsEnd(updatedMatch, battingTeam?.name);
  } else {
    if (match.innings[1]) {
      if (match.innings[1].runs > match.innings[0].runs) {
        handleInningsEnd(updatedMatch, battingTeam?.name);
      }
    } else {
      updateLiveMatch(updatedMatch);
      setLiveMatch(updatedMatch);
    }
  }
};

export const handleExtra = (
  type: 'wide' | 'no_ball' | 'bye' | 'leg_bye',
  params: ExtraHandleParams
) => {
  const { showActionSheetWithOptions, handleScore, setExtraType, setShowExtraRunsInput } = params;

  showActionSheetWithOptions(
    {
      options: ['No Extra Runs', 'Add Extra Runs', 'Cancel'],
      cancelButtonIndex: 2,
      title: 'Additional runs taken?',
    },
    (selectedIndex?: number) => {
      if (selectedIndex === 0) {
        handleScore(0, type);
      }

      if (selectedIndex === 1) {
        setExtraType(type);
        setShowExtraRunsInput(true);
      }
    }
  );
};

export const handleUndo = (
  lastBallsLength: number,
  setLastBalls: (fn: (prev: BallEvent[]) => BallEvent[]) => void,
  showAlert: (title: string, message: string, buttons: any[]) => void
) => {
  if (lastBallsLength === 0) return;
  triggerHaptic();
  showAlert('Undo', 'Undo last ball? (Max 2 balls can be undone)', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Undo', style: 'destructive', onPress: () => setLastBalls(prev => prev.slice(0, -1)) },
  ]);
};
