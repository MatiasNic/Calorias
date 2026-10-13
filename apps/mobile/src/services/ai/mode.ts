import { env } from '@/config/env';
import { useSessionStore } from '@/stores/session';

/** Demo mode: deterministic fixtures with the same contracts and a simulated delay. */
export const mocked = () => env.useMocks;
export const MOCK_DELAY_MS = 1600;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** AI needs a server identity: guests on a real backend must create an account first. */
export function aiAvailable(): 'ok' | 'needs_account' {
  if (mocked()) return 'ok';
  return useSessionStore.getState().status === 'authenticated' ? 'ok' : 'needs_account';
}
