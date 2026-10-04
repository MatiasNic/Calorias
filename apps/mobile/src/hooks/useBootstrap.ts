import { useEffect, useState } from 'react';

import { auth } from '@/services/auth';
import { initAnalytics } from '@/services/analytics';
import { getDb } from '@/services/db/database';
import { configureNotificationHandler } from '@/services/notifications';
import { initPurchases } from '@/services/purchases';
import { startSyncEngine } from '@/services/sync/engine';
import { useSessionStore } from '@/stores/session';

/** One-time app start: local DB, session restore, sync, purchases, analytics. */
export function useBootstrap() {
  const [ready, setReady] = useState(false);
  const status = useSessionStore((s) => s.status);
  const userId = useSessionStore((s) => s.userId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        getDb();
        configureNotificationHandler();
        await auth.restore();
        initAnalytics();
      } catch (e) {
        console.warn('bootstrap failed', e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    return startSyncEngine();
  }, [status]);

  useEffect(() => {
    if (!userId) return;
    initPurchases(userId).catch(() => undefined);
  }, [userId]);

  return ready;
}
