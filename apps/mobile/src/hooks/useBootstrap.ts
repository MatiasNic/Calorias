import { useEffect, useState } from 'react';

import { auth } from '@/services/auth';
import { initAnalytics } from '@/services/analytics';
import { getDb } from '@/services/db/database';
import { rescheduleReminders } from '@/features/settings/useNotificationSettings';
import { configureNotificationHandler } from '@/services/notifications';
import { dbEvents } from '@/services/db/repository';
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
        await getDb();
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

  // Keep the reminder schedule fresh: on start and whenever today's meals change (smart reminders).
  useEffect(() => {
    if (!ready || status === 'signedOut') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const reschedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        await rescheduleReminders().catch(() => undefined);
      }, 2000);
    };
    reschedule();
    const unsub = dbEvents.subscribe((c) => {
      if (c === 'meals') reschedule();
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [ready, status]);

  useEffect(() => {
    if (!userId) return;
    initPurchases(userId).catch(() => undefined);
  }, [userId]);

  return ready;
}
