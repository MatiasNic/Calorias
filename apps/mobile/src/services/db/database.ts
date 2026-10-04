import * as SQLite from 'expo-sqlite';

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

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('plato.db');
    db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    migrate(db);
  }
  return db;
}

function migrate(database: SQLite.SQLiteDatabase) {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version]!;
    database.withTransactionSync(() => {
      database.execSync(sql);
      database.execSync(`PRAGMA user_version = ${version + 1}`);
    });
    version += 1;
  }
}

/** Wipes all local user data (sign-out / account deletion). */
export async function resetLocalDatabase() {
  const database = getDb();
  await database.execAsync('DELETE FROM records; DELETE FROM sync_state; DELETE FROM cache;');
}
