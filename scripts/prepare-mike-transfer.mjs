import { writeFile } from 'node:fs/promises';
import { migrationClient } from './database.mjs';

const db=migrationClient();
try {
  const [members,tournament]=await Promise.all([
    db`SELECT * FROM public.members ORDER BY id`,
    import('../data/tournaments/psmc5x5.json',{with:{type:'json'}}).then(module=>module.default),
  ]);
  if(members.length!==25)throw new Error('Sono attesi 25 membri');
  const mike=members.find(m=>m.id==='af9db7e8-7a90-4e0d-acf7-aaf41626a47d');
  if(mike?.email!=='mike92_@live.it'||mike.challonge_username?.toLowerCase()!=='mikemorz'||mike.score!==8||!mike.must_change_password)throw new Error('Scheda Mike incompleta');
  const payload={tournament,members:members.map(m=>Object.fromEntries(Object.entries(m).map(([key,value])=>[key.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase()),value])))};
  const path=new URL('../.local-data/sites-mike-transfer-2026-10-15.json',import.meta.url);
  await writeFile(path,JSON.stringify(payload),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({file:path.pathname,members:members.length,results:tournament.results.length,totalPoints:members.reduce((sum,m)=>sum+m.score,0)}));
} finally {await db.end();}
