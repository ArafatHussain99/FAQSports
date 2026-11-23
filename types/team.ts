export type TypeTeamInfo = {
  id?: string;
  name: string;
  sport: 'cricket' | 'football';
  short_name?: string;
  color: string;
  logo_url?: string;
  captain_player_id?: string;
};