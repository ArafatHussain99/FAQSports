import { Alert } from 'react-native';
import { CricketInnings, CricketMatch, Player } from '@/types';
import { triggerHaptic } from './scoreEngine';

export interface InningsEngineParams {
  currentMatch: CricketMatch | null;
  updateLiveMatch: (match: CricketMatch) => void;
  setLiveMatch: (match: CricketMatch) => void;
  getPlayerById: (id: string) => Player | undefined;
  getTeamById: (id: string) => any;
  endMatch: (match: CricketMatch, winner: string, result: string) => void;
  router: any;
  showActionSheetWithOptions: (config: any, callback: (index?: number) => void) => void;
  handleInningsEnd?: (match: CricketMatch, battingTeamName: string | undefined) => void;
}

export const selectOpeningStriker = (
  innings: CricketInnings,
  match: CricketMatch,
  params: InningsEngineParams
) => {
  const { getPlayerById, updateLiveMatch, setLiveMatch, showActionSheetWithOptions } = params;

  const battingPlayers = innings.battingTeam === match.teamA ? match.playingXI_A : match.playingXI_B;
  const bowlingPlayers = innings.bowlingTeam === match.teamA ? match.playingXI_A : match.playingXI_B;

  const battingOptions = battingPlayers.map(id => getPlayerById(id)?.name!);
  const bowlingOptions = bowlingPlayers.map(id => getPlayerById(id)?.name!);

  // STEP 1: Select striker
  showActionSheetWithOptions(
    {
      options: battingOptions,
      title: 'Select Striker',
    },
    (strikerIndex) => {
      if (strikerIndex === undefined) return;

      const strikerId = battingPlayers[strikerIndex];

      // STEP 2: Select non striker
      const nonStrikerOptions = battingPlayers.filter(id => id !== strikerId);

      setTimeout(() => {
        showActionSheetWithOptions(
          {
            options: nonStrikerOptions.map(id => getPlayerById(id)?.name!),
            title: 'Select Non-Striker',
          },
          (nonStrikerIndex) => {
            if (nonStrikerIndex === undefined) return;

            const nonStrikerId = nonStrikerOptions[nonStrikerIndex];

            setTimeout(() => {
              // STEP 3: Select bowler
              showActionSheetWithOptions(
                {
                  options: bowlingOptions,
                  title: 'Select Bowler',
                },
                (bowlerIndex) => {
                  if (bowlerIndex === undefined) return;

                  const bowlerId = bowlingPlayers[bowlerIndex];

                  const newInnings: CricketInnings = {
                    ...innings,
                    currentStriker: strikerId,
                    currentNonStriker: nonStrikerId,
                    currentBowler: bowlerId,
                  };

                  const updatedMatch: CricketMatch = {
                    ...match,
                    currentInnings: 2 as const,
                    innings: [match.innings[0], newInnings],
                  };

                  console.log(getPlayerById(updatedMatch.innings[1].currentStriker!)?.name);

                  updateLiveMatch(updatedMatch);
                  setLiveMatch(updatedMatch);
                }
              );
            }, 300);
          }
        );
      }, 300);
    }
  );
};

export const handleInningsEnd = (
  match: CricketMatch,
  battingTeamName: string | undefined,
  params: InningsEngineParams
) => {
  const { getTeamById, endMatch, router, showActionSheetWithOptions } = params;

  if (match.currentInnings === 1) {
    Alert.alert(
      'Innings Complete',
      `${battingTeamName} scored ${match.innings[0].runs}/${match.innings[0].wickets}`,
      [
        {
          text: 'Start 2nd Innings',
          onPress: () => {
            const battingTeam = match.innings[0].bowlingTeam;
            const bowlingTeam = match.innings[0].battingTeam;
            const secondInnings: CricketInnings = {
              battingTeam,
              bowlingTeam,
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
            };

            selectOpeningStriker(secondInnings, match, { ...params, showActionSheetWithOptions });
          },
        },
      ]
    );
  } else {
    const teamAScore = match.innings[0].runs;
    const teamBScore = match.innings[1].runs;
    const winner = teamAScore > teamBScore ? match.teamA : match.teamB;
    const winnerTeam = getTeamById(winner);
    const margin =
      winner === match.teamA
        ? Math.abs(teamAScore - teamBScore)
        : Math.abs(match.playingXI_A.length - match.innings[1].wickets);
    const result =
      winner === match.teamA
        ? `${winnerTeam?.name} won by ${margin} runs`
        : `${winnerTeam?.name} won by ${margin} wickets`;

    Alert.alert('Match Complete!', result, [
      {
        text: 'Finish',
        onPress: () => {
          endMatch(match, winner, result);
          router.replace('/');
        },
      },
    ]);
  }
};

export const selectNewBowler = (
  context: any,
  params: InningsEngineParams
) => {
  const { updateLiveMatch, setLiveMatch, showActionSheetWithOptions } = params;
  const { innings, updatedMatch, bowlingPlayers } = context;

  console.log('bowlingPlayers', bowlingPlayers);
  const newBowler = bowlingPlayers.filter((player: Player) => player.id !== innings.currentBowler);

  const options = newBowler.map((p: any) => p.name);
  console.log(options)

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

export const swapStrike = (
  currentMatch: CricketMatch | null,
  params: InningsEngineParams
) => {
  const { updateLiveMatch, setLiveMatch } = params;

  if (!currentMatch) return;

  triggerHaptic();

  const updatedMatch = { ...currentMatch };
  const innings = { ...updatedMatch.innings[updatedMatch.currentInnings - 1] };
  const temp = innings.currentStriker;
  innings.currentStriker = innings.currentNonStriker;
  innings.currentNonStriker = temp;
  updatedMatch.innings[updatedMatch.currentInnings - 1] = innings;
  updateLiveMatch(updatedMatch);
  setLiveMatch(updatedMatch);
};

export const handleEndMatch = (
  currentMatch: CricketMatch | null,
  params: InningsEngineParams,
  showAlert: (title: string, message: string, buttons: any[]) => void
) => {
  const { getTeamById, endMatch, router } = params;

  if (!currentMatch) return;

  showAlert('End Match', 'Are you sure you want to end this match?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'End Match',
      style: 'destructive',
      onPress: () => {
        const team1Score = currentMatch.innings[0]?.runs || 0;
        const team2Score = currentMatch.innings[1]?.runs || 0;
        const winner = team1Score >= team2Score ? currentMatch.teamA : currentMatch.teamB;
        const winnerTeam = getTeamById(winner);
        endMatch(currentMatch, winner, `${winnerTeam?.name} won`);
        router.replace('/');
      },
    },
  ]);
};
