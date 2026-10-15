import { readFile, writeFile } from 'node:fs/promises';
import { migrationClient } from './database.mjs';

const localUrl = new URL(process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL);
if (localUrl.hostname !== '127.0.0.1' && localUrl.hostname !== 'localhost') throw new Error('Local database required');
const db = migrationClient();
try {
  const [members, messages, stages, results] = await Promise.all([
    db`SELECT * FROM public.members ORDER BY id`, db`SELECT * FROM public.guild_messages ORDER BY id`,
    db`SELECT * FROM public.tournament_stages ORDER BY slug`, db`SELECT * FROM public.tournament_results ORDER BY stage_slug, source_key`,
  ]);
  const cloud = JSON.parse(await readFile(new URL('../.local-data/sites-pre-transfer-2026-10-15.json', import.meta.url), 'utf8'));
  const tournament = JSON.parse(await readFile(new URL('../data/tournaments/psmc5x5.json', import.meta.url), 'utf8'));
  const snapshot = { format: 'torino-quest-v1', exportedAt: new Date().toISOString(), source: 'local-postgres', members, guild_messages: messages, tournament_stages: stages, tournament_results: results };
  const path = new URL('../.local-data/local-pre-transfer-2026-10-15.json', import.meta.url);
  await writeFile(path, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const payload = { tournament, members: members.map(m => Object.fromEntries(Object.entries(m).map(([k,v]) => [k.replace(/_([a-z])/g, (_,c) => c.toUpperCase()), v]))) };
  await writeFile(new URL('../.local-data/sites-transfer-2026-10-15.json', import.meta.url), JSON.stringify(payload), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ backup: path.pathname, members: members.length, results: results.length, newMembers: members.filter(m => !cloud.members.some(c => c.id === m.id)).map(m => ({ username: m.challonge_username, name: [m.first_name, m.last_name].filter(Boolean).join(' ') })), totalPoints: members.reduce((s,m) => s+m.score,0) }));
} finally { await db.end(); }
