import { createClient } from '@supabase/supabase-js';

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
