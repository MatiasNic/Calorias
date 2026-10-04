import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { kvJSONStorage } from './kv';

export const GUEST_USER_ID = 'local-guest';

export type SessionStatus = 'loading' | 'signedOut' | 'guest' | 'authenticated';

export interface SessionState {
  status: SessionStatus;
  userId: string | null;
  email: string | null;
  /** Demo mode: mocks enabled (no backend). The user behaves like a local account. */
  demo: boolean;
  /** Has the user seen the welcome screen / accepted terms. */
  termsAccepted: boolean;
  setGuest: (demo: boolean) => void;
  setAuthenticated: (userId: string, email: string | null) => void;
  setSignedOut: () => void;
  acceptTerms: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      status: 'signedOut',
      userId: null,
      email: null,
      demo: false,
      termsAccepted: false,
      setGuest: (demo) => set({ status: 'guest', userId: GUEST_USER_ID, email: null, demo }),
      setAuthenticated: (userId, email) =>
        set({ status: 'authenticated', userId, email, demo: false }),
      setSignedOut: () => set({ status: 'signedOut', userId: null, email: null, demo: false }),
      acceptTerms: () => set({ termsAccepted: true }),
    }),
    {
      name: 'plato.session',
      storage: kvJSONStorage,
      version: 1,
      // The real Supabase session lives in encrypted storage; this only remembers guest/demo mode.
      partialize: (s) => ({
        status:
          s.status === 'guest'
            ? s.status
            : s.status === 'authenticated'
              ? 'authenticated'
              : 'signedOut',
        userId: s.userId,
        email: s.email,
        demo: s.demo,
        termsAccepted: s.termsAccepted,
      }),
    },
  ),
);

export function currentUserId(): string {
  return useSessionStore.getState().userId ?? GUEST_USER_ID;
}
