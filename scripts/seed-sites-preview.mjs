import { readFileSync, writeFileSync } from 'node:fs';
const backup = JSON.parse(readFileSync(new URL('../.local-data/sites-pre-transfer-2026-10-15.json', import.meta.url),'utf8'));
const quote = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
const statements=[];
for (const table of ['members','guild_messages']) for (const row of backup[table]) {
  const keys=Object.keys(row);
  statements.push(`INSERT INTO "${table}" (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(k=>quote(row[k])).join(',')});`);
}
const file=new URL('../.local-data/sites-preview-seed.sql',import.meta.url);
writeFileSync(file,statements.join('\n')+'\n',{flag:'wx',mode:0o600});
console.log('Preview seed generated from verified cloud backup.');
