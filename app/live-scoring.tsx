import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Modal, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, RotateCcw, ArrowLeftRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useMatches, useData } from '@/context/AppContext';
import { BallEvent, BatsmanScore, CricketInnings, CricketMatch, Player, TypeDismissalType } from '@/types';
import { useActionSheet } from '@expo/react-native-action-sheet';

const runButtons = [
  { value: 0, label: '0', color: Colors.border },
  { value: 1, label: '1', color: Colors.surface },
  { value: 2, label: '2', color: Colors.surface },
  { value: 3, label: '3', color: Colors.surface },
  { value: 4, label: '4', color: Colors.secondary },
  { value: 6, label: '6', color: Colors.primary },
];

const extraButtons = [
  { type: 'wide' as const, label: 'Wide', color: Colors.warning },
  { type: 'no_ball' as const, label: 'No Ball', color: Colors.warning },
  { type: 'out' as const, label: 'OUT', color: Colors.error },
  { type: 'dead_ball' as const, label: 'Dead', color: Colors.textMuted },
];

export default function LiveScoringScreen() {
  const router = useRouter();
  const { currentMatch, updateLiveMatch, endMatch, setLiveMatch } = useMatches();
  const { getPlayerById, getTeamById } = useData();
  const [lastBalls, setLastBalls] = useState<BallEvent[]>([]);
  const { showActionSheetWithOptions } = useActionSheet();


  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const selectOpeningStriker = (
    innings: CricketInnings,
    match: CricketMatch
  ) => {

    const battingPlayers =
      match.playingXI_B;

    const bowlingPlayers =
      battingPlayers === match.playingXI_A
        ? match.playingXI_B
        : match.playingXI_A;

    const battingOptions = battingPlayers.map(id =>
      getPlayerById(id)?.name!
    );

    const bowlingOptions = bowlingPlayers.map(id =>
      getPlayerById(id)?.name!
    );

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
        const nonStrikerOptions =
          battingPlayers.filter(id => id !== strikerId);

        setTimeout(() => {
          showActionSheetWithOptions(
            {
              options: nonStrikerOptions.map(id =>
                getPlayerById(id)?.name!
              ),
              title: 'Select Non-Striker',
            },
            (nonStrikerIndex) => {

              if (nonStrikerIndex === undefined) return;

              const nonStrikerId =
                nonStrikerOptions[nonStrikerIndex];

              setTimeout(() => {
                // STEP 3: Select bowler
                showActionSheetWithOptions(
                  {
                    options: bowlingOptions,
                    title: 'Select Bowler',
                  },
                  (bowlerIndex) => {

                    if (bowlerIndex === undefined) return;

                    const bowlerId =
                      bowlingPlayers[bowlerIndex];

                    const newInnings: CricketInnings = {
                      ...innings,
                      currentStriker: strikerId,
                      currentNonStriker: nonStrikerId,
                      currentBowler: bowlerId,
                    };

                    const updatedMatch: CricketMatch = {
                      ...match,
                      currentInnings: 2 as const,
                      innings: [
                        match.innings[0],
                        newInnings,
                      ],
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


  const handleInningsEnd = useCallback((match: CricketMatch, battingTeamName: string | undefined) => {
    if (match.currentInnings === 1) {
      Alert.alert(
        'Innings Complete',
        `${battingTeamName} scored ${match.innings[0].runs}/${match.innings[0].wickets}`,
        [
          {
            text: 'Start 2nd Innings',
            onPress: () => {
              const battingTeam = match.innings[0].bowlingTeam
              const bowlingTeam = match.innings[0].battingTeam
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
                ballByBall: [],
                fallOfWickets: [],
              };

              selectOpeningStriker(secondInnings, match)
            },
          },
        ]
      );
    } else {
      const teamAScore = match.innings[0].runs;
      const teamBScore = match.innings[1].runs;
      const winner = teamAScore > teamBScore ? match.teamA : match.teamB;
      const winnerTeam = getTeamById(winner);
      const margin = winner === match.teamA ? Math.abs(teamAScore - teamBScore) : Math.abs(match.playingXI_A.length - match.innings[1].wickets);
      const result = winner === match.teamA ? `${winnerTeam?.name} won by ${margin} runs` : `${winnerTeam?.name} won by ${margin} wickets`;

      Alert.alert('Match Complete!', result, [
        {
          text: 'Finish',
          onPress: () => {
            endMatch(match, winner, result);
            router.replace('/(tabs)');
          },
        },
      ]);
    }
  }, [updateLiveMatch, setLiveMatch, getTeamById, endMatch, router]);

  const handleScore = useCallback((runs: number, extraType?: 'wide' | 'no_ball', matchData?: CricketMatch) => {
    const match = matchData || currentMatch;
    if (!match) return;

    triggerHaptic();

    const updatedMatch = { ...match };
    const innings = { ...updatedMatch.innings[updatedMatch.currentInnings - 1] };
    const battingTeam = getTeamById(innings.battingTeam);

    const isLegalBall = !extraType;
    const totalRuns = runs + (extraType ? 1 : 0);

    innings.runs += totalRuns;

    if (extraType === 'wide') {
      innings.extras.wides += 1 + runs;
      innings.extras.total += 1 + runs;
    } else if (extraType === 'no_ball') {
      innings.extras.noBalls += 1;
      innings.extras.total += 1;
      innings.runs += runs;
    }

    if (isLegalBall) {
      innings.balls += 1;
      if (innings.balls === 6) {
        innings.overs += 1;
        innings.balls = 0;
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
        strikeRate: ((updatedBatsmen[strikerIndex].runs + runs) / (updatedBatsmen[strikerIndex].balls + (isLegalBall ? 1 : 0))) * 100,
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

    if ((runs % 2 === 1) || (innings.balls === 0 && isLegalBall)) {
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

    innings.ballByBall = [...innings.ballByBall, ballEvent];
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
  }, [currentMatch, triggerHaptic, updateLiveMatch, setLiveMatch, getTeamById, handleInningsEnd]);

  const processWicket = useCallback((type: TypeDismissalType) => {

    if (!currentMatch) return;

    const updatedMatch = { ...currentMatch };
    const innings =
      { ...updatedMatch.innings[updatedMatch.currentInnings - 1] };


    const battingPlayersIds = updatedMatch.currentInnings === 1 ? updatedMatch.playingXI_A : updatedMatch.playingXI_B;
    const battingPlayers = battingPlayersIds && battingPlayersIds.map<Player>((player) => getPlayerById(player)!);

    const bowlingPlayersIds = battingPlayersIds === updatedMatch.playingXI_A ? updatedMatch.playingXI_B : updatedMatch.playingXI_A;
    const bowlingPlayers = bowlingPlayersIds && bowlingPlayersIds.map((player) => getPlayerById(player)!);

    const strikerIndex =
      innings.batsmen.findIndex(
        b => b.playerId === innings.currentStriker
      );

    const context = {

      type,
      updatedMatch,
      innings,
      battingPlayers,
      bowlingPlayers,
      strikerIndex,

    };

    if (
      type === 'caught' ||
      type === 'run_out' ||
      type === 'stumped'
    ) {

      setTimeout(() => {
        selectFielder(context);
      }, 300);

    }
    else if (type === 'retired') {
      if (strikerIndex < 0) return;

      const batsman =
        innings.batsmen[strikerIndex];

      innings.batsmen[strikerIndex] = {

        ...batsman,

        dismissalType: 'retired',

      };
      setTimeout(() => {
        selectNewBatsman(context);
      }, 300);
    }
    else {

      dismissBatsman(context, undefined);

      setTimeout(() => {
        continueWicketProcess(context);
      }, 300);


    }

  }, [currentMatch]);

  function selectFielder(ctx: any) {

    const options =
      ctx.bowlingPlayers.map((p: any) => p.name);

    showActionSheetWithOptions(

      {
        options,
        title: 'Select fielder',
      },

      (index) => {

        if (index === undefined || index < 0)
          return;

        const fielderId =
          ctx.bowlingPlayers[index].id;

        dismissBatsman(ctx, fielderId);

        setTimeout(() => {
          continueWicketProcess(ctx);
        }, 300);


      }

    );

  }
  function dismissBatsman(ctx: any, fielderId: any) {

    const {

      innings,
      strikerIndex,
      type,

    } = ctx;

    if (strikerIndex < 0) return;

    const batsman =
      innings.batsmen[strikerIndex];

    innings.batsmen[strikerIndex] = {

      ...batsman,

      balls: batsman.balls + 1,

      isOut: true,

      dismissalType: type,

      dismissedBy: innings.currentBowler,

      caughtBy:
        type === 'caught' ? fielderId : undefined,

      runoutBy:
        type === 'run_out' ? fielderId : undefined,

      stumpedBy:
        type === 'stumped' ? fielderId : undefined,

    };

  }
  function continueWicketProcess(ctx: any) {

    const {

      innings,

    } = ctx;

    innings.wickets++;

    innings.balls++;

    if (innings.balls === 6) {

      innings.overs++;
      innings.balls = 0;

    }

    if (innings.currentStriker)

      innings.fallOfWickets.push({

        playerId: innings.currentStriker,

        runs: innings.runs,

        overs:
          innings.overs +
          innings.balls / 10,

        wicketNumber:
          innings.wickets,

      });

    setTimeout(() => {
      selectNewBatsman(ctx);
    }, 300);


  }
  function selectNewBatsman(ctx: any) {

    const {

      battingPlayers,
      innings,
      updatedMatch,

    } = ctx;


    const newBatsmen = battingPlayers.filter(
      (playerOne: Player) =>
        !innings.batsmen.some(
          (playerTwo: BatsmanScore) =>
            playerTwo.playerId === playerOne.id && playerTwo.dismissalType !== 'retired'
        )
    );

    const options =
      newBatsmen.map((p: Player) => p.name);

    if (battingPlayers.length - 1 !== innings.wickets) {

      showActionSheetWithOptions(

        {
          options,
          title: 'Select new batsman',
        },

        (index) => {

          if (index === undefined || index < 0)
            return;

          innings.currentStriker =
            newBatsmen[index].id;

          updatedMatch.innings[
            updatedMatch.currentInnings - 1
          ] = innings;

          updateLiveMatch(updatedMatch);

          setLiveMatch(updatedMatch);

        }

      );
    } else {
      handleInningsEnd(updatedMatch, getTeamById(innings.battingTeam)?.name)
    }

  }

  function selectNewBowler(ctx: any) {

    const {

      bowlingPlayers,
      innings,
      updatedMatch,

    } = ctx;


    const newBowler = innings.bowlers
      .filter((p: BatsmanScore) => !p.isOut);
    const options =
      newBowler.map((p: any) => getPlayerById(p.playerId)?.name);

    if (bowlingPlayers.length !== innings.wickets) {

      showActionSheetWithOptions(

        {
          options,
          title: 'Select new bowler',
        },

        (index) => {

          if (index === undefined || index < 0)
            return;

          innings.currentStriker =
            bowlingPlayers[index].id;

          updatedMatch.innings[
            updatedMatch.currentInnings - 1
          ] = innings;

          updateLiveMatch(updatedMatch);

          setLiveMatch(updatedMatch);

        }

      );
    } else {
      handleInningsEnd(updatedMatch, getTeamById(innings.battingTeam)?.id)
    }

  }




  const handleWicket = (() => {
    const options = [
      'Bowled',
      'Caught',
      'Retired Hurt',
      'Run Out',
      'Stumped',
      'Cancel',
    ];

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
            processWicket('bowled');
            break;
          case 1:
            processWicket('caught');
            break;
          case 2:
            processWicket('retired');
            break;
          case 3:
            processWicket('run_out');
            break;
          case 4:
            processWicket('stumped');
            break;
        }
      }
    );
  });

  const handleUndo = useCallback(() => {
    if (lastBalls.length === 0) return;
    triggerHaptic();
    Alert.alert('Undo', 'Undo last ball? (Max 2 balls can be undone)', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Undo', style: 'destructive', onPress: () => setLastBalls(prev => prev.slice(0, -1)) },
    ]);
  }, [lastBalls.length, triggerHaptic]);

  const swapStrike = useCallback(() => {
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
  }, [currentMatch, triggerHaptic, updateLiveMatch, setLiveMatch]);

  const handleEndMatch = useCallback(() => {
    if (!currentMatch) return;
    Alert.alert('End Match', 'Are you sure you want to end this match?', [
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
          router.replace('/(tabs)');
        },
      },
    ]);
  }, [currentMatch, getTeamById, endMatch, router]);

  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>No active match</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const currentInnings = currentMatch.innings[currentMatch.currentInnings - 1];
  const battingTeam = getTeamById(currentInnings.battingTeam);
  const bowlingTeam = getTeamById(currentInnings.bowlingTeam);
  const striker = getPlayerById(currentInnings.currentStriker || '');
  const nonStriker = getPlayerById(currentInnings.currentNonStriker || '');
  const bowler = getPlayerById(currentInnings.currentBowler || '');

  const strikerScore = currentInnings.batsmen.find(b => b.playerId === currentInnings.currentStriker);
  const nonStrikerScore = currentInnings.batsmen.find(b => b.playerId === currentInnings.currentNonStriker);
  const bowlerStats = currentInnings.bowlers.find(b => b.playerId === currentInnings.currentBowler);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={handleEndMatch} style={styles.closeBtn}>
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{battingTeam?.shortName} vs {bowlingTeam?.shortName}</Text>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
          <RotateCcw size={20} color={Colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.scoreBoard}>
          <Text style={styles.teamName}>{battingTeam?.name}</Text>
          <View style={styles.mainScore}>
            <Text style={styles.runs}>{currentInnings.runs}</Text>
            <Text style={styles.wickets}>/{currentInnings.wickets}</Text>
          </View>
          <Text style={styles.overs}>
            ({currentInnings.overs}.{currentInnings.balls} / {currentMatch.totalOvers} ov)
          </Text>
          <Text style={styles.crr}>
            CRR: {((currentInnings.runs / (currentInnings.overs + currentInnings.balls / 6)) || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.playersContainer}>
          <View style={styles.batsmenRow}>
            <View style={[styles.playerCard, styles.strikerCard]}>
              <View style={styles.strikerBadge}>
                <Text style={styles.strikerBadgeText}>*</Text>
              </View>
              <Text style={styles.playerName}>{striker?.name || 'Select'}</Text>
              <Text style={styles.playerStats}>
                {strikerScore?.runs || 0} ({strikerScore?.balls || 0})
              </Text>
            </View>
            <TouchableOpacity style={styles.swapBtn} onPress={swapStrike}>
              <ArrowLeftRight size={18} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.playerCard}>
              <Text style={styles.playerName}>{nonStriker?.name || 'Select'}</Text>
              <Text style={styles.playerStats}>
                {nonStrikerScore?.runs || 0} ({nonStrikerScore?.balls || 0})
              </Text>
            </View>
          </View>

          <View style={styles.bowlerCard}>
            <Text style={styles.bowlerLabel}>Bowler</Text>
            <Text style={styles.playerName}>{bowler?.name || 'Select'}</Text>
            <Text style={styles.playerStats}>
              {bowlerStats?.overs || 0}.{bowlerStats?.balls || 0} - {bowlerStats?.runs || 0} - {bowlerStats?.wickets || 0}
            </Text>
          </View>
        </View>

        <View style={styles.thisOver}>
          <Text style={styles.thisOverLabel}>This Over</Text>
          <View style={styles.ballsRow}>
            {lastBalls.slice(-6).map((ball, i) => (
              <View
                key={i}
                style={[
                  styles.ballItem,
                  ball.isWicket && styles.ballWicket,
                  ball.extraType && styles.ballExtra,
                ]}
              >
                <Text style={styles.ballText}>
                  {ball.isWicket ? 'W' : ball.extraType ? `${ball.runs}${ball.extraType === 'wide' ? 'Wd' : 'Nb'}` : ball.runs}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.scoringPad}>
        <View style={styles.runsRow}>
          {runButtons.map((btn) => (
            <TouchableOpacity
              key={btn.value}
              style={[styles.runBtn, { backgroundColor: btn.color }]}
              onPress={() => handleScore(btn.value)}
            >
              <Text style={styles.runBtnText}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.extrasRow}>
          {extraButtons.map((btn) => (
            <TouchableOpacity
              key={btn.type}
              style={[styles.extraBtn, { backgroundColor: btn.color }]}
              onPress={() => btn.type === 'out' ? handleWicket() : handleScore(0, btn.type === 'dead_ball' ? undefined : btn.type)}
            >
              <Text style={[styles.extraBtnText, btn.type === 'out' && styles.outBtnText]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Modal
          visible={false}
          animationType="slide"

        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Modal Content</Text>
            <Button title="Close" />
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  errorBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.live,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.live,
    letterSpacing: 1,
  },
  undoBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  scoreBoard: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  teamName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  mainScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  runs: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  wickets: {
    fontSize: 32,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  overs: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  crr: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '600' as const,
  },
  playersContainer: {
    marginBottom: 16,
  },
  batsmenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  playerCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  strikerCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  strikerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  strikerBadgeText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  swapBtn: {
    padding: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  playerStats: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bowlerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  bowlerLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  thisOver: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
  },
  thisOverLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  ballsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ballItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballWicket: {
    backgroundColor: Colors.error,
  },
  ballExtra: {
    backgroundColor: Colors.warning,
  },
  ballText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  scoringPad: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  runsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  runBtn: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runBtnText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  extrasRow: {
    flexDirection: 'row',
    gap: 10,
  },
  extraBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  outBtnText: {
    color: Colors.text,
  },
});
