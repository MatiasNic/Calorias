import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';

import { track } from '@/services/analytics';
import { invokeFunction } from '@/services/api/client';
import { auth } from '@/services/auth';
import { getDb, resetLocalDatabase } from '@/services/db/database';
import { useSessionStore } from '@/stores/session';
import { usePrefsStore } from '@/stores/prefs';

const isAccount = () => useSessionStore.getState().status === 'authenticated';

/** Local dump of every record on the device (guest/demo, or offline fallback). */
async function localExport(): Promise<Record<string, unknown[]>> {
  const rows = await (
    await getDb()
  ).getAllAsync<{ collection: string; data: string }>(
    'SELECT collection, data FROM records WHERE deleted_at IS NULL',
  );
  const out: Record<string, unknown[]> = {};
  for (const r of rows) (out[r.collection] ??= []).push(JSON.parse(r.data));
  return out;
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
    content = JSON.stringify(
      { exported_at: new Date().toISOString(), ...(await localExport()) },
      null,
      2,
    );
  }
  const file = new File(
    Paths.cache,
    `plato-export-${new Date().toISOString().slice(0, 10)}.${format}`,
  );
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'csv' ? 'text/csv' : 'application/json',
    });
  }
  return file.uri;
}

/** Deletes the account on the server (data + photos, cascade) and wipes the device. */
export async function deleteMyAccount() {
  if (isAccount()) await invokeFunction('delete-account', { confirm: true });
  track('account_deleted');
  await resetLocalDatabase();
  usePrefsStore.getState().reset();
  await auth.signOut().catch(() => undefined);
  useSessionStore.getState().setSignedOut();
}
