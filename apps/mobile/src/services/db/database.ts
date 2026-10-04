import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

/** Local schema version. Bump and add a step to MIGRATIONS when the local schema changes. */
const MIGRATIONS: readonly string[] = [
  // v1
  `
  CREATE TABLE IF NOT EXISTS records (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    local_date TEXT,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    dirty INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (collection, id)
  );
  CREATE INDEX IF NOT EXISTS records_by_date ON records (collection, local_date);
  CREATE INDEX IF NOT EXISTS records_dirty ON records (dirty) WHERE dirty = 1;
  CREATE TABLE IF NOT EXISTS sync_state (
    collection TEXT PRIMARY KEY,
    last_pulled_at TEXT
  );
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TEXT
  );
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (once) and migrates the local database. All access is async (no JS-thread blocking). */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // Web is only used for previews: keep data in memory (avoids OPFS file locking).
      const db = await SQLite.openDatabaseAsync(Platform.OS === 'web' ? ':memory:' : 'plato.db');
      // WAL is not supported by the OPFS-backed web build (used only for previews).
      if (Platform.OS !== 'web') await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await migrate(db);
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function migrate(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version]!;
    await database.withTransactionAsync(async () => {
      await database.execAsync(sql);
      await database.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version += 1;
  }
}

/** Wipes all local user data (sign-out / account deletion). */
export async function resetLocalDatabase() {
  const database = await getDb();
  await database.execAsync('DELETE FROM records; DELETE FROM sync_state; DELETE FROM cache;');
}
