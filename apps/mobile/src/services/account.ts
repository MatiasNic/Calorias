import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';

import { track } from '@/services/analytics';
import { invokeFunction } from '@/services/api/client';
import { auth } from '@/services/auth';
import { getDb } from '@/services/db/database';
import { deleteExportFiles, EXPORT_PREFIX, wipeDeviceUserData } from '@/services/deviceData';
import { currentUserId, useSessionStore } from '@/stores/session';
import { usePrefsStore } from '@/stores/prefs';
import type { MealRecord } from '@/services/db/types';

const isAccount = () => useSessionStore.getState().status === 'authenticated';

/** Local dump of every record on the device (guest/demo, or offline fallback). */
async function localExport(): Promise<Record<string, unknown[]>> {
  const rows = await (
    await getDb()
  ).getAllAsync<{ collection: string; data: string }>(
    'SELECT collection, data FROM records WHERE deleted_at IS NULL AND user_id = ?',
    [currentUserId()],
  );
  const out: Record<string, unknown[]> = {};
  for (const r of rows) (out[r.collection] ??= []).push(JSON.parse(r.data));
  return out;
}

const csvCell = (v: unknown) => {
  const str = v == null ? '' : String(v);
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/** One row per food item logged on this device (same columns as the server CSV export). */
function localCsv(meals: unknown[]): string {
  const header = [
    'date',
    'time',
    'meal_type',
    'food',
    'grams',
    'kcal',
    'protein_g',
    'carbs_g',
    'fat_g',
  ];
  const rows = (meals as MealRecord[]).flatMap((m) =>
    m.items.map((i) => [
      m.local_date,
      m.eaten_at.slice(11, 16),
      m.meal_type,
      i.display_name,
      Math.round(i.grams),
      Math.round(i.nutrients.kcal),
      Math.round(i.nutrients.protein_g * 10) / 10,
      Math.round(i.nutrients.carbs_g * 10) / 10,
      Math.round(i.nutrients.fat_g * 10) / 10,
    ]),
  );
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

/** Right of access: exports personal data as JSON (everyone) or CSV (premium) and opens the share sheet. */
export async function exportMyData(format: 'json' | 'csv') {
  let content: string;
  if (isAccount()) {
    if (format === 'csv') {
      const res = await invokeFunction('export-data', { format }, z.object({ csv: z.string() }));
      content = res.csv;
    } else {
      content = JSON.stringify(await invokeFunction('export-data', { format }), null, 2);
    }
  } else {
    const local = await localExport();
    content =
      format === 'csv'
        ? localCsv(local.meals ?? [])
        : JSON.stringify({ exported_at: new Date().toISOString(), ...local }, null, 2);
  }
  // The receiving app may still be reading the last one: older dumps are removed here instead.
  deleteExportFiles();
  const file = new File(
    Paths.cache,
    `${EXPORT_PREFIX}${new Date().toISOString().slice(0, 10)}.${format}`,
  );
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
    });
  }
}

/** Deletes the account on the server (data + photos, cascade) and wipes the device. */
export async function deleteMyAccount() {
  if (isAccount()) await invokeFunction('delete-account', { confirm: true });
  track('account_deleted');
  usePrefsStore.getState().reset();
  // Nothing of the old account may survive on the device (the server data is already gone).
  await auth.signOut({ force: true }).catch(() => undefined);
  await wipeDeviceUserData();
  useSessionStore.getState().setSignedOut();
}
