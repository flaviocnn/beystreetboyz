import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('tournament resync resolves a migrated OAuth member ID and remains idempotent', async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname), 'Local test database required');
  const databaseName = 'tq_sync_test_' + randomBytes(8).toString('hex');
  const admin = postgres(url.toString(), { max: 1, prepare: false });
  let db;
  try {
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    url.pathname = '/' + databaseName;
    db = postgres(url.toString(), { max: 1, prepare: false });
    const migrations = new URL('../supabase/migrations/', import.meta.url);
    for (const name of (await readdir(migrations)).filter(n=>n.endsWith('.sql')).sort()) await db.unsafe(await readFile(new URL(name,migrations),'utf8'));
    const source = JSON.parse(await readFile(new URL('../data/tournaments/psmc5x5.json', import.meta.url),'utf8'));
    const liveId = randomUUID();
    for (const [index,row] of source.results.entries()) {
      const id = row.challongeUsername?.toLowerCase() === 'granburstone' ? liveId : row.memberId;
      await db`INSERT INTO members(id, first_name, challonge_username, password_salt, password_hash, created_at) VALUES (${id}, 'Fixture', ${row.challongeUsername || 'fixture_' + index}, 'test', 'test', ${new Date().toISOString()})`;
    }
    const env = { ...process.env, DATABASE_URL: url.toString(), DATABASE_MIGRATION_URL: url.toString() };
    for (let i = 0; i < 2; i++) {
      const run = spawnSync(process.execPath,['scripts/sync-tournament.mjs','data/tournaments/psmc5x5.json'],{env,encoding:'utf8'});
      assert.equal(run.status,0,run.stderr);
      assert.equal((await db`SELECT count(*)::integer n FROM tournament_results`)[0].n,24);
      assert.equal((await db`SELECT sum(score)::integer n FROM members`)[0].n,786);
      assert.equal((await db`SELECT score FROM members WHERE id = ${liveId}`)[0].score,15);
      assert.equal((await db`SELECT member_id FROM tournament_results WHERE challonge_username = 'granburstone'`)[0].member_id,liveId);
    }
  } finally {
    if(db) await db.end();
    // Only the isolated, randomly named database created by this test is removed.
    await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  }
});
