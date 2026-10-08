import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { env } from '@/config/env';
import { currentLocale } from '@/i18n';
import { resetLocalDatabase } from '@/services/db/database';
import { adoptGuestData, pendingChangesCount } from '@/services/db/repository';
import { getSupabase } from '@/services/supabase/client';
import { syncNow } from '@/services/sync/engine';
import { GUEST_USER_ID, useSessionStore } from '@/stores/session';
import { deviceTimeZone } from '@/utils/dates';

WebBrowser.maybeCompleteAuthSession();

export class AuthError extends Error {
  constructor(
    public code:
      | 'invalid_credentials'
      | 'email_not_confirmed'
      | 'email_taken'
      | 'weak_password'
      | 'cancelled'
      | 'provider_unavailable'
      | 'network'
      | 'unknown',
    message?: string,
  ) {
    super(message ?? code);
  }
}

function mapError(e: { message?: string; code?: string; status?: number } | null): AuthError {
  const msg = (e?.message ?? '').toLowerCase();
  if (e?.code === 'invalid_credentials' || msg.includes('invalid login'))
    return new AuthError('invalid_credentials');
  if (e?.code === 'email_not_confirmed' || msg.includes('not confirmed'))
    return new AuthError('email_not_confirmed');
  if (e?.code === 'user_already_exists' || msg.includes('already registered'))
    return new AuthError('email_taken');
  if (e?.code === 'weak_password' || msg.includes('password'))
    return new AuthError('weak_password');
  if (msg.includes('network') || msg.includes('fetch')) return new AuthError('network');
  return new AuthError('unknown', e?.message);
}

const redirectTo = () => Linking.createURL('auth/callback');

/** In-flight or finished PKCE code exchanges, keyed by code. */
const codeExchanges = new Map<string, Promise<void>>();

/** Query and fragment params of an auth redirect (Supabase puts errors in either). */
export function redirectParams(url: string): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash?.split('?')[1] ?? '';
  // Parsed by hand: React Native's URLSearchParams is incomplete without a polyfill.
  const decode = (v: string) => {
    try {
      return decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      return v;
    }
  };
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      const key = decode(i < 0 ? pair : pair.slice(0, i));
      out[key] = i < 0 ? '' : decode(pair.slice(i + 1));
    }
  }
  return out;
}

/** When a guest creates an account, their local data is attached to it and uploaded. */
async function onAuthenticated(userId: string, email: string | null) {
  const prev = useSessionStore.getState();
  if (prev.status === 'guest') {
    await adoptGuestData(userId, GUEST_USER_ID);
  } else if (prev.userId && prev.userId !== userId) {
    await resetLocalDatabase();
  }
  useSessionStore.getState().setAuthenticated(userId, email);
  syncNow().catch(() => undefined);
}

export const auth = {
  /** Demo/guest: local-only data. In mock mode every sign-in path lands here. */
  async continueAsGuest() {
    useSessionStore.getState().setGuest(env.useMocks);
  },

  async signInWithEmail(email: string, password: string) {
    const sb = getSupabase();
    if (!sb) return auth.continueAsGuest();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) throw mapError(error);
    await onAuthenticated(data.user.id, data.user.email ?? null);
  },

  /** Returns true when the user must confirm the email before signing in. */
  async signUpWithEmail(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<{ needsConfirmation: boolean }> {
    const sb = getSupabase();
    if (!sb) {
      await auth.continueAsGuest();
      return { needsConfirmation: false };
    }
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo(),
        data: { display_name: displayName, locale: currentLocale(), timezone: deviceTimeZone() },
      },
    });
    if (error) throw mapError(error);
    if (data.session && data.user) {
      await onAuthenticated(data.user.id, data.user.email ?? null);
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  },

  async sendPasswordReset(email: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('auth/reset-password'),
    });
    if (error) throw mapError(error);
  },

  async updatePassword(password: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw mapError(error);
  },

  async signInWithGoogle() {
    const sb = getSupabase();
    if (!sb) return auth.continueAsGuest();
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo(), skipBrowserRedirect: true },
    });
    if (error || !data.url) throw mapError(error);
    // Supabase answers 400 when the provider isn't enabled in the project: say so instead of
    // opening a browser that only shows a JSON error.
    const probe = await fetch(data.url).catch(() => null);
    if (probe?.status === 400) throw new AuthError('provider_unavailable');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo());
    if (result.type !== 'success') throw new AuthError('cancelled');
    await auth.handleAuthRedirect(result.url);
  },

  async signInWithApple() {
    const sb = getSupabase();
    if (!sb) return auth.continueAsGuest();
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED')
        throw new AuthError('cancelled');
      throw mapError(e as Error);
    }
    if (!credential.identityToken) throw new AuthError('unknown', 'No identity token');
    const { data, error } = await sb.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error || !data.user) throw mapError(error);
    // Apple only returns the name on first sign-in: persist it.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    if (fullName) await sb.auth.updateUser({ data: { full_name: fullName } });
    await onAuthenticated(data.user.id, data.user.email ?? null);
  },

  /** Handles bocado://auth/callback?code=… (OAuth / email confirmation / magic links). */
  async handleAuthRedirect(url: string) {
    const sb = getSupabase();
    if (!sb) return;
    const params = redirectParams(url);
    if (params.error) {
      const description = (params.error_description ?? '').toLowerCase();
      throw description.includes('not enabled') || description.includes('unsupported provider')
        ? new AuthError('provider_unavailable')
        : new AuthError('unknown', params.error_description ?? params.error);
    }
    const code = params.code;
    if (!code) throw new AuthError('unknown', 'Missing auth code');
    // The redirect reaches both the auth session and the /auth/callback route: exchange once.
    let pending = codeExchanges.get(code);
    if (!pending) {
      pending = (async () => {
        const { data, error } = await sb.auth.exchangeCodeForSession(code);
        if (error || !data.user) throw mapError(error);
        await onAuthenticated(data.user.id, data.user.email ?? null);
      })();
      codeExchanges.set(code, pending);
    }
    await pending;
  },

  /** Restores a persisted Supabase session at startup. */
  async restore() {
    const sb = getSupabase();
    const store = useSessionStore.getState();
    if (!sb) {
      if (store.status === 'authenticated') store.setGuest(true);
      return;
    }
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (user) store.setAuthenticated(user.id, user.email ?? null);
    else if (store.status === 'authenticated') store.setSignedOut();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') useSessionStore.getState().setSignedOut();
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.user) {
        const s = useSessionStore.getState();
        if (s.status !== 'authenticated')
          s.setAuthenticated(session.user.id, session.user.email ?? null);
      }
    });
  },

  /** Number of local changes that would be lost on sign-out (unsynced). */
  pendingChanges: pendingChangesCount,

  async signOut() {
    const sb = getSupabase();
    if (sb) {
      await syncNow().catch(() => undefined);
      await sb.auth.signOut();
    }
    await resetLocalDatabase();
    useSessionStore.getState().setSignedOut();
  },
};
