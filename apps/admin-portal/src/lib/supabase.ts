import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://uvddwyfcqdxuvssunuby.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_IovkxVUMzdj9m5eZAfTZSQ_3OySgVjX';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_SUPABASE_KEY;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

export const STORAGE_TOKEN_KEY = 'cybelinx_api_token';

/**
 * Synchronizes the active Supabase JWT session token into local storage
 * so the Cybelinx API client automatically attaches Bearer <token>.
 */
export function syncSupabaseToken(session: Session | null): string | null {
  if (typeof window === 'undefined') return null;
  if (session?.access_token) {
    window.localStorage.setItem(STORAGE_TOKEN_KEY, session.access_token);
    return session.access_token;
  }
  return null;
}

export async function getCurrentSupabaseUser(): Promise<{ user: User | null; session: Session | null }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return { user: null, session: null };
  }
  syncSupabaseToken(data.session);
  return { user: data.session.user, session: data.session };
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_TOKEN_KEY);
  }
}
