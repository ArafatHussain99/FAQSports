import { ImageSourcePropType } from 'react-native';

// Cover pictures for player profiles, bundled with the app.
// Supabase stores only the `key` (players.cover_image_key); the image itself lives
// in assets/images/player-covers/.
//
// To add a picture:
//   1. Put the file in assets/images/player-covers/ (JPG or PNG, ideally square
//      or landscape, at least 1024 px wide, under ~500 KB).
//   2. Add an entry below. `key` must be lowercase letters, digits and dashes
//      (it's checked by a database constraint) and must never change once used.
//   3. Restart the bundler (`npx expo start -c`).

export interface PlayerCover {
  key: string;
  label: string;
  source: ImageSourcePropType;
}

export const PLAYER_COVERS: PlayerCover[] = [
  {
    key: 'table-tennis-smash',
    label: 'Table Tennis Smash',
    source: require('../assets/images/player-covers/table-tennis-smash.jpg'),
  },
];

export const getPlayerCover = (key?: string | null): PlayerCover | undefined =>
  key ? PLAYER_COVERS.find(cover => cover.key === key) : undefined;
