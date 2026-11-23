import { Player } from '@/types';

export const playerName = (players: Player[], id: string | null | undefined, short = false) => {
  if (!id) return '';
  const name = players.find(p => p.id === id)?.name ?? 'Unknown';
  return short ? name.split(' ')[0] : name;
};

/** "Alex" for singles, "Alex & Sam" for doubles. */
export const teamLabel = (players: Player[], ids: string[], short = true) =>
  ids.map(id => playerName(players, id, short)).join(' & ');
