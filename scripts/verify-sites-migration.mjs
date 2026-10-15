import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const root = process.argv[2];
if (!root) throw new Error('Sites checkout required');
const snapshot = JSON.parse(readFileSync(new URL('../.local-data/sites-pre-transfer-2026-10-15.json', import.meta.url), 'utf8'));
const dbPath = new URL('../.local-data/sites-restored-pre-transfer-2026-10-15.sqlite', import.meta.url).pathname;
writeFileSync(dbPath, '', { flag: 'wx', mode: 0o600 });
const db = new DatabaseSync(dbPath);
const migrations = JSON.parse(readFileSync(root + '/drizzle/meta/_journal.json','utf8')).entries;
for (const item of migrations.filter(m => m.idx < 4)) db.exec(readFileSync(root + '/drizzle/' + item.tag + '.sql','utf8'));
for (const table of ['members','guild_messages']) for (const row of snapshot[table]) {
  const keys=Object.keys(row); const q=keys.map(k=>'"'+k+'"').join(',');
  db.prepare(`INSERT INTO "${table}" (${q}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));
}
db.exec('PRAGMA foreign_keys = ON');
const normalize = rows => rows.map(r=>JSON.stringify(Object.fromEntries(Object.entries(r).sort()))).sort();
const before = Object.fromEntries(['members','guild_messages'].map(t=>[t,normalize(db.prepare(`SELECT * FROM ${t}`).all())]));
const migration = readFileSync(root + '/drizzle/' + migrations.find(m=>m.idx===4).tag + '.sql','utf8');
db.exec('BEGIN');
try { db.exec(migration); db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; }
for (const table of ['members','guild_messages']) assert.deepEqual(normalize(db.prepare(`SELECT * FROM ${table}`).all()),before[table],table+' changed');
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
assert.equal(db.prepare('SELECT count(*) n FROM tournament_results').get().n,0);
db.close(); chmodSync(dbPath,0o600);
console.log(JSON.stringify({ restoredDatabase:dbPath, migrationSha256:createHash('sha256').update(migration).digest('hex'), membersPreserved:snapshot.members.length,messagesPreserved:snapshot.guild_messages.length, foreignKeys:'ok', integrity:'ok' }));
