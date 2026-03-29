import { BatsmanScore, CricketMatch, Player, TypeDismissalType } from '@/types';

export interface WicketEngineParams {
  currentMatch: CricketMatch | null;
  updateLiveMatch: (match: CricketMatch) => void;
  setLiveMatch: (match: CricketMatch) => void;
  getPlayerById: (id: string) => Player | undefined;
  getTeamById: (id: string) => any;
  showActionSheetWithOptions: (config: any, callback: (index?: number) => void) => void;
  handleInningsEnd: (match: CricketMatch, battingTeamName: string | undefined) => void;
}

export const processWicket = (
  type: TypeDismissalType,
  params: WicketEngineParams
) => {
  const { currentMatch, getPlayerById } = params;

  if (!currentMatch) return;

  const updatedMatch = { ...currentMatch };
  const innings = { ...updatedMatch.innings[updatedMatch.currentInnings - 1] };

  const battingPlayersIds = updatedMatch.currentInnings === 1 ? updatedMatch.playingXI_A : updatedMatch.playingXI_B;
  const battingPlayers = battingPlayersIds && battingPlayersIds.map<Player>((player) => getPlayerById(player)!);

  const bowlingPlayersIds = battingPlayersIds === updatedMatch.playingXI_A ? updatedMatch.playingXI_B : updatedMatch.playingXI_A;
  const bowlingPlayers = bowlingPlayersIds && bowlingPlayersIds.map((player) => getPlayerById(player)!);

  console.log(bowlingPlayers);

  const strikerIndex = innings.batsmen.findIndex(b => b.playerId === innings.currentStriker);
  const bowlerIndex = innings.bowlers.findIndex(b => b.playerId === innings.currentBowler);

  const context = {
    type,
    updatedMatch,
    innings,
    battingPlayers,
    bowlingPlayers,
    strikerIndex,
    bowlerIndex,
  };

  if (type === 'caught' || type === 'run_out' || type === 'stumped') {
    setTimeout(() => {
      selectFielder(context, params);
    }, 300);
  } else if (type === 'retired') {
    if (strikerIndex < 0) return;

    const batsman = innings.batsmen[strikerIndex];

    innings.batsmen[strikerIndex] = {
      ...batsman,
      dismissalType: 'retired',
    };
    setTimeout(() => {
      selectNewBatsman(context, params);
    }, 300);
  } else {
    dismissBatsman(context, undefined, params);

    setTimeout(() => {
      continueWicketProcess(context, params);
    }, 300);
  }
};

export const selectFielder = (
  context: any,
  params: WicketEngineParams
) => {
  const { showActionSheetWithOptions } = params;
  const { bowlingPlayers } = context;

  const options = bowlingPlayers.map((p: any) => p.name);

  showActionSheetWithOptions(
    {
      options,
      title: 'Select fielder',
    },
    (index) => {
      if (index === undefined || index < 0) return;

      const fielderId = bowlingPlayers[index].id;

      dismissBatsman(context, fielderId, params);

      setTimeout(() => {
        continueWicketProcess(context, params);
      }, 300);
    }
  );
};

export const dismissBatsman = (
  context: any,
  fielderId: any,
  params: WicketEngineParams,
  extraType?: 'wide' | 'no_ball' | 'bye' | 'leg_bye'
) => {
  const { innings, strikerIndex, type, bowlerIndex } = context;

  if (strikerIndex < 0 || bowlerIndex < 0) return;

  const batsman = innings.batsmen[strikerIndex];

  innings.batsmen[strikerIndex] = {
    ...batsman,
    balls: batsman.balls + 1,
    isOut: true,
    dismissalType: type,
    dismissedBy: innings.currentBowler,
    caughtBy: type === 'caught' ? fielderId : undefined,
    runoutBy: type === 'run_out' ? fielderId : undefined,
    stumpedBy: type === 'stumped' ? fielderId : undefined,
  };

  if (bowlerIndex >= 0) {
    const newBalls = innings.bowlers[bowlerIndex].balls + 1;
    const newOvers = innings.bowlers[bowlerIndex].overs + Math.floor(newBalls / 6);
    innings.bowlers[bowlerIndex] = {
      ...innings.bowlers[bowlerIndex],
      balls: newBalls % 6,
      overs: newOvers,
      wickets:
        type === 'caught' || type === 'hit_wicket' || type === 'stumped' || type === 'bowled'
          ? innings.bowlers[bowlerIndex].wickets + 1
          : innings.bowlers[bowlerIndex].wickets,
      wides: innings.bowlers[bowlerIndex].wides + (extraType === 'wide' ? 1 : 0),
      noBalls: innings.bowlers[bowlerIndex].noBalls + (extraType === 'no_ball' ? 1 : 0),
      economy: innings.bowlers[bowlerIndex].runs / ((newOvers + newBalls / 6) || 1),
    };
  } else if (innings.currentBowler) {
    innings.bowlers.push({
      playerId: innings.currentBowler,
      overs: 0,
      balls: 1,
      maidens: 0,
      runs: 0,
      wickets: type === 'caught' || type === 'hit_wicket' || type === 'stumped' || type === 'bowled' ? 1 : 0,
      economy: 0,
      wides: extraType === 'wide' ? 1 : 0,
      noBalls: extraType === 'no_ball' ? 1 : 0,
    });
  }
};

export const continueWicketProcess = (
  context: any,
  params: WicketEngineParams
) => {
  const { innings, updatedMatch } = context;

  innings.wickets++;
  innings.balls++;

  if (innings.balls === 6) {
    innings.overs++;
    innings.balls = 0;

    if (innings.overs < updatedMatch.totalOvers) {
      setTimeout(() => {
        selectNewBowler(context, params);
      }, 300);
    }
  }

  if (innings.currentStriker) {
    innings.fallOfWickets.push({
      playerId: innings.currentStriker,
      runs: innings.runs,
      overs: innings.overs + innings.balls / 10,
      wicketNumber: innings.wickets,
    });
  }

  setTimeout(() => {
    selectNewBatsman(context, params);
  }, 300);
};

export const selectNewBatsman = (
  context: any,
  params: WicketEngineParams
) => {
  const { updateLiveMatch, setLiveMatch, getTeamById, handleInningsEnd, showActionSheetWithOptions } = params;
  const { battingPlayers, innings, updatedMatch } = context;

  const newBatsmen = battingPlayers.filter(
    (playerOne: Player) =>
      !innings.batsmen.some(
        (playerTwo: BatsmanScore) => playerTwo.playerId === playerOne.id && playerTwo.dismissalType !== 'retired'
      )
  );

  const options = newBatsmen.map((p: Player) => p.name);

  if (battingPlayers.length - 1 !== innings.wickets) {
    showActionSheetWithOptions(
      {
        options,
        title: 'Select new batsman',
      },
      (index) => {
        if (index === undefined || index < 0) return;

        innings.currentStriker = newBatsmen[index].id;

        updatedMatch.innings[updatedMatch.currentInnings - 1] = innings;

        updateLiveMatch(updatedMatch);
        setLiveMatch(updatedMatch);
      }
    );
  } else {
    handleInningsEnd(updatedMatch, getTeamById(innings.battingTeam)?.name);
  }
};

export const selectNewBowler = (
  context: any,
  params: WicketEngineParams
) => {
  const { updateLiveMatch, setLiveMatch, showActionSheetWithOptions, getPlayerById } = params;
  const { innings, updatedMatch } = context;

  const bowlingPlayersIds = updatedMatch.currentInnings === 1 ? updatedMatch.playingXI_B : updatedMatch.playingXI_A;
  const bowlingPlayers = bowlingPlayersIds && bowlingPlayersIds.map((player: string) => getPlayerById(player)!);

  console.log('bowlingPlayers', bowlingPlayers);

  const newBowler = bowlingPlayers.filter((player: Player) => player.id !== innings.currentBowler);

  const options = newBowler.map((p: any) => p.name);

  showActionSheetWithOptions(
    {
      options,
      title: 'Select new bowler',
    },
    (index) => {
      if (index === undefined || index < 0) return;

      innings.currentBowler = newBowler[index].id;

      console.log(innings.currentBowler);

      updatedMatch.innings[updatedMatch.currentInnings - 1] = innings;

      updateLiveMatch(updatedMatch);
      setLiveMatch(updatedMatch);
    }
  );
};

export const handleWicket = (
  params: WicketEngineParams,
  showActionSheetWithOptions: (config: any, callback: (index?: number) => void) => void
) => {
  const options = ['Bowled', 'Caught', 'Retired Hurt', 'Run Out', 'Stumped', 'Cancel'];
  const cancelButtonIndex = 5;

  showActionSheetWithOptions(
    {
      options,
      cancelButtonIndex,
      title: 'Wicket!',
      message: 'Select dismissal type',
    },
    (selectedIndex) => {
      switch (selectedIndex) {
        case 0:
          processWicket('bowled', params);
          break;
        case 1:
          processWicket('caught', params);
          break;
        case 2:
          processWicket('retired', params);
          break;
        case 3:
          processWicket('run_out', params);
          break;
        case 4:
          processWicket('stumped', params);
          break;
      }
    }
  );
};
