import { Directory, File, Paths } from 'expo-file-system';

import { readSnapshot, snapshotFor, writeQueue, writeSnapshot } from '@/features/widgets/snapshot';
import { refreshWidgets } from '@/features/widgets/sync';
import { getDb, resetLocalDatabase } from '@/services/db/database';
import { deleteLocalPhotos } from '@/services/image';
import { cancelAllNotifications } from '@/services/notifications';
import { resetPurchases } from '@/services/purchases';
import { kv } from '@/stores/kv';
import { todayLocal } from '@/utils/dates';

/** Device keys that belong to the signed-in person (not device preferences like theme). */
const USER_KEYS = ['plato.mockQuota', 'plato.mockTrials', 'plato.mealPlan', 'plato.mealPlanPrefs'];

/**
 * Removes everything personal from the device: diary, photos, widget numbers, reminders, meal
 * plan and plan status. Used on sign-out, on account deletion and when another account signs in.
 */
export async function wipeDeviceUserData() {
  await resetLocalDatabase();
  for (const key of USER_KEYS) kv.remove(key);
  // Widgets: back to an empty day (keeps the user's language for the labels) and no pending taps.
  writeQueue([]);
  const labels = readSnapshot()?.labels;
  const snapshot = snapshotFor(todayLocal(), null);
  if (labels) snapshot.labels = labels;
  writeSnapshot(snapshot);
  await refreshWidgets(snapshot).catch(() => undefined); // no widget on the home screen is fine
  try {
    deleteLocalPhotos();
  } catch {
    // best-effort: the folder may be in use; it is overwritten per meal anyway
  }
  deleteExportFiles();
  await cancelAllNotifications();
  await resetPurchases();
}

export const EXPORT_PREFIX = 'bocado-export-';

/** Data exports left in the cache (they contain every personal record). */
export function deleteExportFiles() {
  try {
    for (const entry of new Directory(Paths.cache).list())
      if (entry instanceof File && entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
  } catch {
    // best-effort
  }
}

/** Accounts whose rows are stored on this device. */
export async function localDataOwners(): Promise<string[]> {
  const rows = await (
    await getDb()
  ).getAllAsync<{ user_id: string }>('SELECT DISTINCT user_id FROM records');
  return rows.map((r) => r.user_id);
}
