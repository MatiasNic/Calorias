#!/usr/bin/env node
/**
 * Applies supabase/migrations + seeds to a fresh database and runs the RLS test-suite.
 * Uses DATABASE_URL (CI: postgres service). If it is unset and a local Postgres install is
 * found, a throwaway cluster is started automatically.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let baseUrl = process.env.DATABASE_URL;
let cleanup = () => {};

async function startLocalPostgres() {
  const bin = ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin'].find((d) =>
    existsSync(join(d, 'initdb')),
  );
  if (!bin) throw new Error('DATABASE_URL not set and no local Postgres found');
  const dir = mkdtempSync(join(tmpdir(), 'plato-pg-'));
  const port = 54329;
  const asPg = process.getuid?.() === 0;
  const run = (cmd, args) => {
    const full = join(bin, cmd);
    if (asPg)
      execFileSync('su', ['postgres', '-s', '/bin/sh', '-c', [full, ...args].join(' ')], {
        stdio: 'ignore',
      });
    else execFileSync(full, args, { stdio: 'ignore' });
  };
  if (asPg) execFileSync('chown', ['postgres', dir]);
  run('initdb', ['-D', dir, '-U', 'postgres', '--auth=trust']);
  run('pg_ctl', ['-D', dir, '-o', `"-p ${port} -k /tmp"`, '-w', 'start']);
  cleanup = () => {
    try {
      run('pg_ctl', ['-D', dir, '-m', 'fast', 'stop']);
    } catch {
      // ignore
    }
    rmSync(dir, { recursive: true, force: true });
  };
  return `postgres://postgres@127.0.0.1:${port}/postgres`;
}

async function main() {
  if (!baseUrl) baseUrl = await startLocalPostgres();
  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  await admin.query('drop database if exists plato_test');
  await admin.query('create database plato_test');
  await admin.end();

  const testUrl = baseUrl.replace(/\/[^/]*$/, '/plato_test');
  const db = new pg.Client({ connectionString: testUrl });
  await db.connect();
  const hasAuth =
    (await db.query(`select 1 from pg_namespace where nspname = 'auth'`)).rowCount > 0;
  if (!hasAuth)
    await db.query(
      readFileSync(join(root, 'supabase/tests/bootstrap-vanilla-postgres.sql'), 'utf8'),
    );

  const migDir = join(root, 'supabase/migrations');
  for (const f of readdirSync(migDir)
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    process.stdout.write(`→ migration ${f}\n`);
    await db.query(readFileSync(join(migDir, f), 'utf8'));
  }
  const seedDir = join(root, 'supabase/seed');
  for (const f of readdirSync(seedDir)
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    process.stdout.write(`→ seed ${f}\n`);
    await db.query(readFileSync(join(seedDir, f), 'utf8'));
  }
  await db.end();

  const code = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--test', '--test-reporter=spec', join(root, 'supabase/tests/rls/rls.test.mjs')],
      {
        stdio: 'inherit',
        env: { ...process.env, TEST_DATABASE_URL: testUrl },
      },
    );
    child.on('exit', resolve);
  });
  return code;
}

main()
  .then((code) => {
    cleanup();
    process.exit(code ?? 1);
  })
  .catch((e) => {
    console.error(e);
    cleanup();
    process.exit(1);
  });
