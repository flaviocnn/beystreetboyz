import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
const name = process.argv[2];
if (!/^[a-z0-9-]+\.json$/.test(name || '')) throw new Error('Invalid backup name');
await mkdir(new URL('../.local-data/', import.meta.url), { recursive: true, mode: 0o700 });
console.log('Ready for snapshot JSON on stdin (input is hidden).');
const lines = createInterface({ input: process.stdin });
for await (const line of lines) {
  const snapshot = JSON.parse(line);
  for (const table of ['members', 'guild_messages', 'tournament_stages', 'tournament_results']) if (!Array.isArray(snapshot[table])) throw new Error('Missing table');
  const bytes = JSON.stringify(snapshot, null, 2) + '\n';
  await writeFile(new URL('../.local-data/' + name, import.meta.url), bytes, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ file: name, members: snapshot.members.length, messages: snapshot.guild_messages.length, results: snapshot.tournament_results.length, totalPoints: snapshot.members.reduce((s, m) => s + m.score, 0), sha256: createHash('sha256').update(bytes).digest('hex') }));
  lines.close(); break;
}
