import { readFile, writeFile } from 'node:fs/promises';
const base = 'https://beystreetboyz.vercel.app';
const route = base + '/api/internal/production-transfer';
const auth = JSON.parse(process.env.PRODUCTION_TRANSFER_AUTH || 'null');
if (!auth?.token || auth.expires < Date.now()) throw new Error('Missing or expired transfer credentials');
const mode = process.argv[2];
const path = name => new URL('../.local-data/' + name, import.meta.url);
async function call(method, body) {
  const res = await fetch(route, { method, redirect: 'error', signal: AbortSignal.timeout(65000), headers: { Authorization: 'Bearer ' + auth.token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(`Transfer failed (${res.status}): ${error.error || 'unavailable'}`); }
  return res.json();
}
if (mode === 'backup') {
  const result = await call('GET');
  await writeFile(path('vercel-pre-cutover-2026-10-15.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ fingerprint: result.fingerprint, tables: Object.fromEntries(Object.entries(result.snapshot).map(([k,v]) => [k,v.length])), liveMembers: result.snapshot.members.map(m => ({ id: m.id, username: m.challonge_username, score: m.score })) }));
} else if (mode === 'plan' || mode === 'apply') {
  const backup = JSON.parse(await readFile(path('vercel-pre-cutover-2026-10-15.json'), 'utf8'));
  const source = JSON.parse(await readFile(path('sites-cutover-2026-10-15.json'), 'utf8'));
  const result = await call('POST', { mode, expectedFingerprint: backup.fingerprint, source });
  await writeFile(path(`vercel-${mode}-cutover-2026-10-15.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ summary: result.summary, idMap: result.idMap, fingerprint: result.fingerprint }));
} else if (mode === 'verify') {
  const result = await call('GET');
  const applied = JSON.parse(await readFile(path('vercel-apply-cutover-2026-10-15.json'), 'utf8'));
  if (result.fingerprint !== applied.fingerprint) throw new Error('State changed after transfer; inspect before accepting');
  await writeFile(path('vercel-post-cutover-2026-10-15.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ verified: true, tables: Object.fromEntries(Object.entries(result.snapshot).map(([k,v]) => [k,v.length])), totalPoints: result.snapshot.members.reduce((s,m) => s+m.score,0) }));
} else throw new Error('Use backup, plan, apply or verify');
