import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from '@/config/env';
import type { Database } from './database.types';
import { secureSessionStorage } from './secureSessionStorage';

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

/** Returns the Supabase client, or null in mock/demo mode (no backend configured). */
export function getSupabase(): TypedSupabaseClient | null {
  if (env.useMocks || !env.backendConfigured) return null;
  if (!client) {
    client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
    // Refresh tokens only while the app is in the foreground (Supabase RN guidance).
    AppState.addEventListener('change', (state) => {
      if (!client) return;
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }
  return client;
}

export function requireSupabase(): TypedSupabaseClient {
  const c = getSupabase();
  if (!c) throw new Error('Supabase is not configured (mock mode)');
  return c;
}
