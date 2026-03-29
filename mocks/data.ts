import { Player, Team, CricketMatch, Notification, Tournament } from '@/types';

export const mockPlayers: Player[] = [
  // =====================
  // THE MISFIELDERS (t1)
  // =====================
  {
    id: 'p1',
    name: 'Arif',
    teamId: 't1',
    position: 'All-rounder',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm medium',
    stats: {
      matches: 2,
      runs: 25,
      balls: 0,
      wickets: 2,
      catches: 0,
      runOuts: 1,
      stumpings: 0,
      highestScore: 25,
      bestBowling: '2 wickets',
      fifties: 0,
      centuries: 0,
      average: 12.5,
      strikeRate: 0,
      economyRate: 0,
      goals: 8,
      assists: 3,
      wins: 15,
    },
    ratings: { batting: 60, bowling: 65, fielding: 55, overall: 63 },
    lastFivePerformances: [],
  },
  {
    id: 'p2',
    name: 'Sazzad',
    teamId: 't1',
    position: 'Batsman',
    battingStyle: 'right',
    bowlingStyle: 'None',
    stats: {
      matches: 2,
      runs: 11,
      balls: 0,
      wickets: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 11,
      bestBowling: '-',
      fifties: 0,
      centuries: 0,
      average: 5.5,
      strikeRate: 0,
      economyRate: 0,
      goals: 12,
      assists: 6,
      wins: 18,
    },
    ratings: { batting: 45, bowling: 10, fielding: 40, overall: 38 },
    lastFivePerformances: [],
  },
  {
    id: 'p3',
    name: 'Habib',
    teamId: 't1',
    position: 'All-rounder',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm spin',
    stats: {
      matches: 2,
      runs: 0,
      balls: 0,
      wickets: 1,
      catches: 1,
      runOuts: 0,
      stumpings: 0,
      highestScore: 0,
      bestBowling: '1 wicket',
      fifties: 0,
      centuries: 0,
      average: 0,
      strikeRate: 0,
      economyRate: 0,
      goals: 5,
      assists: 2,
      wins: 12,
    },
    ratings: { batting: 20, bowling: 55, fielding: 60, overall: 45 },
    lastFivePerformances: [],
  },
  {
    id: 'p4',
    name: 'Zuel',
    teamId: 't1',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 2,
      balls: 0,
      wickets: 3,
      catches: 1,
      runOuts: 0,
      stumpings: 0,
      highestScore: 2,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 1,
      strikeRate: 0,
      economyRate: 0,
      goals: 3,
      assists: 1,
      wins: 10,
    },
    ratings: { batting: 25, bowling: 80, fielding: 60, overall: 70 },
    lastFivePerformances: [],
  },
  {
    id: 'p5',
    name: 'Sourav',
    teamId: 't1',
    position: 'All-rounder',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm medium',
    stats: {
      matches: 2,
      runs: 11,
      balls: 0,
      wickets: 2,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 11,
      bestBowling: '2 wickets',
      fifties: 0,
      centuries: 0,
      average: 5.5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 50, bowling: 65, fielding: 45, overall: 58 },
    lastFivePerformances: [],
  },
  {
    id: 'p6',
    name: 'Mahfuj',
    teamId: 't1',
    position: 'Batsman',
    battingStyle: 'right',
    bowlingStyle: 'None',
    stats: {
      matches: 2,
      runs: 2,
      balls: 0,
      wickets: 0,
      catches: 1,
      runOuts: 0,
      stumpings: 0,
      highestScore: 2,
      bestBowling: '-',
      fifties: 0,
      centuries: 0,
      average: 1,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 25, bowling: 5, fielding: 55, overall: 28 },
    lastFivePerformances: [],
  },
  {
    id: 'p7',
    name: 'Fajle',
    teamId: 't1',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm medium',
    stats: {
      matches: 2,
      runs: 0,
      balls: 0,
      wickets: 0,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 0,
      bestBowling: '-',
      fifties: 0,
      centuries: 0,
      average: 0,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 10, bowling: 30, fielding: 35, overall: 25 },
    lastFivePerformances: [],
  },

  // =====================
  // ELITE STRIKERS (t2)
  // =====================
  {
    id: 'p8',
    name: 'Alomgir',
    teamId: 't2',
    position: 'All-rounder',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 43,
      balls: 0,
      wickets: 5,
      catches: 1,
      runOuts: 0,
      stumpings: 0,
      highestScore: 43,
      bestBowling: '5 wickets',
      fifties: 0,
      centuries: 0,
      average: 21.5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 80, bowling: 90, fielding: 65, overall: 88 },
    lastFivePerformances: [],
  },
  {
    id: 'p9',
    name: 'Radwan',
    teamId: 't2',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p10',
    name: 'Arafat Hussain',
    teamId: 't2',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p11',
    name: 'Jubair Kabir',
    teamId: 't2',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p12',
    name: 'Mehedi',
    teamId: 't2',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p13',
    name: 'Hasan',
    teamId: 't2',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p14',
    name: 'Tanvir',
    teamId: 't2',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },

  // =====================
  // TEAM TENACIOUS (t3)
  // =====================
  {
    id: 'p15',
    name: 'Naba',
    teamId: 't3',
    position: 'Batsman',
    battingStyle: 'right',
    bowlingStyle: 'None',
    stats: {
      matches: 2,
      runs: 16,
      balls: 0,
      wickets: 0,
      catches: 0,
      runOuts: 1,
      stumpings: 0,
      highestScore: 16,
      bestBowling: '-',
      fifties: 0,
      centuries: 0,
      average: 8,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 55, bowling: 5, fielding: 50, overall: 45 },
    lastFivePerformances: [],
  },
  {
    id: 'p16',
    name: 'Tanjir',
    teamId: 't3',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 4,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '4 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 88, fielding: 45, overall: 78 },
    lastFivePerformances: [],
  },
  {
    id: 'p17',
    name: 'Miraj',
    teamId: 't3',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p18',
    name: 'Towsif',
    teamId: 't3',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p19',
    name: 'Sadat',
    teamId: 't3',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p20',
    name: 'Sadman',
    teamId: 't3',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },
  {
    id: 'p21',
    name: 'Arfan',
    teamId: 't3',
    position: 'Bowler',
    battingStyle: 'right',
    bowlingStyle: 'Right-arm fast',
    stats: {
      matches: 2,
      runs: 10,
      balls: 0,
      wickets: 3,
      catches: 0,
      runOuts: 0,
      stumpings: 0,
      highestScore: 10,
      bestBowling: '3 wickets',
      fifties: 0,
      centuries: 0,
      average: 5,
      strikeRate: 0,
      economyRate: 0,
    },
    ratings: { batting: 35, bowling: 80, fielding: 45, overall: 72 },
    lastFivePerformances: [],
  },

];


export const mockTeams: Team[] = [
  {
    id: 't1',
    name: 'Team Tenacious',
    shortName: 'TT',
    color: '#00D4AA',
    players: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    captain: 'p6',
  },
  {
    id: 't2',
    name: 'Elite Strikers',
    shortName: 'ES',
    color: '#4A9EFF',
    players: ['p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'],
    captain: 'p11',
  },
  {
    id: 't3',
    name: 'The Misfielders',
    shortName: 'TM',
    color: '#FF6B35',
    players: ['p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21'],
    captain: 'p21',
  },
];

export const mockLiveMatch: CricketMatch = {
  id: 'live1',
  sport: 'cricket',
  status: 'live',
  matchType: 'long',
  totalOvers: 20,
  ground: 'Company Ground A',
  teamA: 't2',
  teamB: 't1',
  tossWinner: 't2',
  tossDecision: 'bat',
  playingXI_A: ['p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14'],
  playingXI_B: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
  substitutes_A: [],
  substitutes_B: [],
  currentInnings: 1,
  innings: [
    {
      battingTeam: 't1',
      bowlingTeam: 't2',
      runs: 127,
      wickets: 3,
      overs: 14,
      balls: 2,
      extras: { wides: 5, noBalls: 2, byes: 1, legByes: 3, total: 11 },
      batsmen: [
        { playerId: 'p8', runs: 42, balls: 33, fours: 5, sixes: 2, strikeRate: 140.63, isOut: false },
        { playerId: 'p9', runs: 23, balls: 17, fours: 3, sixes: 0, strikeRate: 146.67, isOut: true, dismissalType: 'caught', dismissedBy: 'p8', caughtBy: 'p8' },
        { playerId: 'p10', runs: 12, balls: 9, fours: 2, sixes: 0, strikeRate: 150, isOut: true, dismissalType: 'bowled', dismissedBy: 'p14' },
        { playerId: 'p12', runs: 5, balls: 3, fours: 1, sixes: 0, strikeRate: 166.67, isOut: false, dismissalType: 'retired', dismissedBy: 'p7' },
        { playerId: 'p14', runs: 38, balls: 28, fours: 4, sixes: 1, strikeRate: 135.71, isOut: false },
      ],
      bowlers: [
        { playerId: 'p1', overs: 4, balls: 0, maidens: 0, runs: 32, wickets: 1, economy: 8.0, wides: 2, noBalls: 0 },
        { playerId: 'p2', overs: 4, balls: 0, maidens: 1, runs: 24, wickets: 1, economy: 6.0, wides: 1, noBalls: 1 },
        { playerId: 'p4', overs: 3, balls: 2, maidens: 0, runs: 28, wickets: 0, economy: 8.47, wides: 1, noBalls: 0 },
        { playerId: 'p5', overs: 3, balls: 0, maidens: 0, runs: 32, wickets: 0, economy: 10.67, wides: 1, noBalls: 1 },
      ],
      currentStriker: 'p8',
      currentNonStriker: 'p14',
      currentBowler: 'p4',
      allBalls: [],
      thisOver: [],
      fallOfWickets: [
        { playerId: 'p2', runs: 45, overs: 5.3, wicketNumber: 1 },
        { playerId: 'p3', runs: 72, overs: 8.4, wicketNumber: 2 },
        { playerId: 'p7', runs: 85, overs: 10.2, wicketNumber: 3 },
      ],
    },
  ],
  createdAt: '2024-01-20T09:00:00Z',
  startedAt: '2024-01-20T10:00:00Z',
};

export const mockUpcomingMatches: CricketMatch[] = [
  {
    id: 'upcoming1',
    sport: 'cricket',
    status: 'upcoming',
    matchType: 'short',
    totalOvers: 20,
    ground: 'Company Ground B',
    teamA: 't1',
    teamB: 't2',
    tossWinner: '',
    tossDecision: 'bat',
    playingXI_A: [],
    playingXI_B: [],
    substitutes_A: [],
    substitutes_B: [],
    currentInnings: 1,
    innings: [],
    createdAt: '2024-01-21T14:00:00Z',
  },
  {
    id: 'upcoming2',
    sport: 'cricket',
    status: 'upcoming',
    matchType: 'short',
    totalOvers: 20,
    ground: 'Company Ground C',
    teamA: 't1',
    teamB: 't3',
    tossWinner: 't3',
    tossDecision: 'bat',
    playingXI_A: [],
    playingXI_B: [],
    substitutes_A: [],
    substitutes_B: [],
    currentInnings: 1,
    innings: [],
    createdAt: '2024-01-21T14:00:00Z',
  },
];

export const mockCompletedMatches: CricketMatch[] = [
  {
    id: 'completed1',
    sport: 'cricket',
    status: 'completed',
    matchType: 'long',
    totalOvers: 20,
    ground: 'OxySports Arena',

    teamA: 't1',
    teamB: 't3',

    tossWinner: 't3',
    tossDecision: 'bowl',

    playingXI_A: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    playingXI_B: ['p15', 'p16', 'p17', 'p18', 'p19', 'p20', 'p21'],

    substitutes_A: [],
    substitutes_B: [],

    currentInnings: 2,

    innings: [

      // FIRST INNINGS
      {
        battingTeam: 't1',
        bowlingTeam: 't3',

        runs: 165,
        wickets: 7,

        overs: 20,
        balls: 0,

        extras: {
          wides: 8,
          noBalls: 3,
          byes: 2,
          legByes: 4,
          total: 17
        },

        batsmen: [

          {
            playerId: 'p1',
            runs: 52,
            balls: 41,
            fours: 6,
            sixes: 1,
            strikeRate: 126.83,
            isOut: true,
            dismissalType: 'caught',
            dismissedBy: 'p17',
            caughtBy: 'p18'
          },

          {
            playerId: 'p2',
            runs: 34,
            balls: 22,
            fours: 4,
            sixes: 1,
            strikeRate: 154.55,
            isOut: true,
            dismissalType: 'bowled',
            dismissedBy: 'p15'
          },

          {
            playerId: 'p3',
            runs: 12,
            balls: 10,
            fours: 1,
            sixes: 0,
            strikeRate: 120,
            isOut: true,
            dismissalType: 'run_out',
            dismissedBy: 'p19',
            runoutBy: 'p19'
          },

          {
            playerId: 'p4',
            runs: 41,
            balls: 30,
            fours: 3,
            sixes: 2,
            strikeRate: 136.67,
            isOut: true,
            dismissalType: 'caught',
            dismissedBy: 'p20',
            caughtBy: 'p21'
          },

          {
            playerId: 'p5',
            runs: 8,
            balls: 6,
            fours: 1,
            sixes: 0,
            strikeRate: 133.33,
            isOut: false,
          },

          {
            playerId: 'p6',
            runs: 6,
            balls: 5,
            fours: 0,
            sixes: 0,
            strikeRate: 120,
            isOut: true,
            dismissalType: 'caught',
            dismissedBy: 'p15',
            caughtBy: 'p17'
          },

          {
            playerId: 'p7',
            runs: 5,
            balls: 4,
            fours: 0,
            sixes: 0,
            strikeRate: 125,
            isOut: false
          }

        ],

        bowlers: [

          {
            playerId: 'p15',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 28,
            wickets: 2,
            economy: 7.0,
            wides: 2,
            noBalls: 1
          },

          {
            playerId: 'p16',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 35,
            wickets: 1,
            economy: 8.75,
            wides: 1,
            noBalls: 0
          },

          {
            playerId: 'p17',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 30,
            wickets: 1,
            economy: 7.5,
            wides: 3,
            noBalls: 1
          },

          {
            playerId: 'p20',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 40,
            wickets: 1,
            economy: 10,
            wides: 1,
            noBalls: 1
          },

          {
            playerId: 'p19',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 32,
            wickets: 0,
            economy: 8,
            wides: 1,
            noBalls: 0
          }

        ],

        allBalls: [],

        thisOver: [],

        fallOfWickets: [

          { playerId: 'p2', runs: 58, overs: 6.4, wicketNumber: 1 },

          { playerId: 'p1', runs: 96, overs: 11.2, wicketNumber: 2 },

          { playerId: 'p3', runs: 110, overs: 13.1, wicketNumber: 3 },

          { playerId: 'p5', runs: 130, overs: 15.5, wicketNumber: 4 },

          { playerId: 'p4', runs: 148, overs: 17.6, wicketNumber: 5 },

          { playerId: 'p6', runs: 155, overs: 18.5, wicketNumber: 6 },

          { playerId: 'p7', runs: 165, overs: 20.0, wicketNumber: 7 }

        ]

      },


      // SECOND INNINGS

      {
        battingTeam: 't3',
        bowlingTeam: 't1',

        runs: 158,
        wickets: 10,

        overs: 19,
        balls: 4,

        extras: {
          wides: 5,
          noBalls: 2,
          byes: 1,
          legByes: 2,
          total: 10
        },

        batsmen: [

          {
            playerId: 'p15',
            runs: 44,
            balls: 32,
            fours: 5,
            sixes: 1,
            strikeRate: 137.5,
            isOut: true,
            dismissalType: 'caught',
            dismissedBy: 'p3',
            caughtBy: 'p6'
          },

          {
            playerId: 'p16',
            runs: 26,
            balls: 19,
            fours: 2,
            sixes: 1,
            strikeRate: 136.84,
            isOut: true,
            dismissalType: 'bowled',
            dismissedBy: 'p2'
          },

          {
            playerId: 'p17',
            runs: 18,
            balls: 14,
            fours: 2,
            sixes: 0,
            strikeRate: 128.57,
            isOut: true,
            dismissalType: 'run_out',
            dismissedBy: 'p4',
            runoutBy: 'p4'
          },

          {
            playerId: 'p18',
            runs: 30,
            balls: 21,
            fours: 3,
            sixes: 1,
            strikeRate: 142.85,
            isOut: true,
            dismissalType: 'caught',
            dismissedBy: 'p1',
            caughtBy: 'p7'
          },

          {
            playerId: 'p19',
            runs: 14,
            balls: 11,
            fours: 1,
            sixes: 0,
            strikeRate: 127.27,
            isOut: true,
            dismissalType: 'bowled',
            dismissedBy: 'p5'
          },

          {
            playerId: 'p20',
            runs: 10,
            balls: 9,
            fours: 0,
            sixes: 0,
            strikeRate: 111.11,
            isOut: true,
            dismissalType: 'caught',
            dismissedBy: 'p6',
            caughtBy: 'p3'
          },

          {
            playerId: 'p21',
            runs: 6,
            balls: 5,
            fours: 0,
            sixes: 0,
            strikeRate: 120,
            isOut: false,
          }

        ],

        bowlers: [

          {
            playerId: 'p1',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 29,
            wickets: 2,
            economy: 7.25,
            wides: 1,
            noBalls: 0
          },

          {
            playerId: 'p2',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 31,
            wickets: 1,
            economy: 7.75,
            wides: 1,
            noBalls: 1
          },

          {
            playerId: 'p3',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 27,
            wickets: 1,
            economy: 6.75,
            wides: 0,
            noBalls: 0
          },

          {
            playerId: 'p5',
            overs: 3,
            balls: 4,
            maidens: 0,
            runs: 35,
            wickets: 1,
            economy: 9.55,
            wides: 2,
            noBalls: 1
          },

          {
            playerId: 'p6',
            overs: 4,
            balls: 0,
            maidens: 0,
            runs: 36,
            wickets: 1,
            economy: 9,
            wides: 1,
            noBalls: 0
          }

        ],

        allBalls: [],

        thisOver: [],

        fallOfWickets: [

          { playerId: 'p16', runs: 41, overs: 5.2, wicketNumber: 1 },

          { playerId: 'p17', runs: 62, overs: 7.4, wicketNumber: 2 },

          { playerId: 'p15', runs: 85, overs: 10.1, wicketNumber: 3 },

          { playerId: 'p19', runs: 112, overs: 13.3, wicketNumber: 4 },

          { playerId: 'p18', runs: 134, overs: 15.2, wicketNumber: 5 },

          { playerId: 'p20', runs: 147, overs: 17.1, wicketNumber: 6 },

          { playerId: 'p21', runs: 158, overs: 19.4, wicketNumber: 7 }

        ]

      }

    ],

    winner: 't1',

    result: 'Tech Tenacious won by 7 runs',

    createdAt: '2024-01-15T09:00:00Z',

    startedAt: '2024-01-15T10:00:00Z',

    completedAt: '2024-01-15T14:30:00Z'

  }

];


export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    userId: 'user1',
    title: 'Match Starting Soon!',
    message: 'Tech Titans vs Code Crushers starts in 15 minutes',
    type: 'match',
    isRead: false,
    createdAt: '2024-01-20T09:45:00Z',
    matchId: 'live1',
  },
  {
    id: 'n2',
    userId: 'user1',
    title: 'Tournament Created',
    message: 'Company Premier League 2024 has been created',
    type: 'tournament',
    isRead: false,
    createdAt: '2024-01-19T15:00:00Z',
    tournamentId: 'tour1',
  },
  {
    id: 'n3',
    userId: 'user1',
    title: 'Match Completed',
    message: 'Tech Titans won by 7 runs against Code Crushers',
    type: 'match',
    isRead: true,
    createdAt: '2024-01-15T14:35:00Z',
    matchId: 'completed1',
  },
];

export const mockTournaments: Tournament[] = [
  {
    id: 'tour1',
    name: 'Company Premier League 2026',
    sport: 'cricket',
    teams: ['t1', 't2', 't3'],
    startDate: '2024-02-01',
    endDate: '2024-03-15',
    status: 'upcoming',
    matches: [],
  },
];

export const grounds = [
  'OxySports Arena',
  'Company Ground B',
  'Central Sports Complex',
  'Tech Park Stadium',
  'Indoor Arena',
];
