import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

const directory = new URL('../.local-data/', import.meta.url);
await mkdir(directory, { recursive: true, mode: 0o700 });
console.log('Ready for backup JSON on stdin (input is hidden).');
const input = createInterface({ input: process.stdin, terminal: false });
for await (const line of input) {
  const snapshot = JSON.parse(line);
  if (snapshot.projectId !== 'appgprj_6aa7f7be256481918e7037d910c59771' || !Array.isArray(snapshot.members) || !Array.isArray(snapshot.guild_messages)) throw new Error('Invalid snapshot');
  const filename = process.argv[2] || 'sites-pre-transfer-2026-10-15.json';
  if (!['sites-pre-transfer-2026-10-15.json', 'sites-post-transfer-2026-10-15.json', 'sites-pre-mike-2026-10-15.json', 'sites-post-mike-2026-10-15.json'].includes(filename)) throw new Error('Invalid backup filename');
  const path = new URL(filename, directory);
  const bytes = JSON.stringify(snapshot, null, 2) + '\n';
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
  const saved = await readFile(path, 'utf8');
  if (saved !== bytes) throw new Error('Backup verification failed');
  console.log(JSON.stringify({ backup: path.pathname, members: snapshot.members.length, messages: snapshot.guild_messages.length, sha256: createHash('sha256').update(saved).digest('hex') }));
  input.close(); break;
}
