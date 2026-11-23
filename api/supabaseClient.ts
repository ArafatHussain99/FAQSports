import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase project for FAQ Sports. The URL is public; it can be overridden
// with EXPO_PUBLIC_SUPABASE_URL (e.g. to point at a local or staging project).
const SUPABASE_PROJECT_ID = 'gflkukmbxjiggvobvitb';
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

// Client key from .env. Prefer the new publishable key (sb_publishable_...);
// the legacy anon key (JWT) is still accepted while Supabase phases it out.
// Never hard-code or log this value, and never use a secret / service_role key in the app.
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add your Supabase publishable key ' +
    '(Project Settings → API Keys) to the .env file in the project root, ' +
    'then restart Expo with `npx expo start -c`.'
  );
}

// iOS/Android have no localStorage, so without this the sign-in only lives in
// memory: after an app restart every request goes out signed out and RLS
// rejects admin writes, even though the cached role still says "admin".
// On web supabase-js uses localStorage by default.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/** Postgres "insufficient privilege" / RLS violation. */
export const isPermissionError = (error: unknown) =>
  !!error && typeof error === 'object' && (error as { code?: string }).code === '42501';

/** Message for a write the database refused because the user isn't a signed-in admin. */
export const PERMISSION_ERROR_MESSAGE =
  "The server didn't accept this as an admin change. Sign out and sign in again; " +
  'if it still fails, check your account has the admin role in Supabase.';
