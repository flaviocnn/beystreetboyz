import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(s,c,next){if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};try{return next(s,c)}catch(e){if(s.startsWith('.'))for(const ext of ['.ts','/index.ts']){const u=new URL(s+ext,c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
test('guild query budget, ranking ties, current cosmetics, privacy and fresh authorization survive batching',async()=>{
  const local=new URL(process.env.DATABASE_URL);assert.ok(['127.0.0.1','localhost'].includes(local.hostname));
  const admin=postgres(local.toString(),{max:1,prepare:false}),name='tq_guild_perf_'+randomBytes(8).toString('hex'),previous=process.env.DATABASE_URL;
  let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);local.pathname='/'+name;db=postgres(local.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=local.toString();
    const {getDb}=await import('../db/index.ts');appDb=getDb();
    const {GET:ranking}=await import('../app/api/guild/ranking/route.ts');
    const {GET:champion}=await import('../app/api/guild/champion/route.ts');
    const {sessionCookie}=await import('../app/lib/auth.ts');
    const ids=Array.from({length:6},()=>randomUUID()),[a,b,c,d,e,f]=ids;
    for(let i=0;i<ids.length;i++)await db`INSERT INTO members(id,first_name,challonge_username,password_salt,password_hash,created_at,score,email) VALUES(${ids[i]},${'Member '+i},${'player_'+i},'salt','hash','2026-10-14',${i<4?120:i===4?100:0},${'private'+i+'@example.invalid'})`;
    for(let i=1;i<=4;i++)await db`INSERT INTO tournament_stages(slug,name,event_date,source_url,attendance,coefficient_milli) VALUES(${'s'+i},${'Stage '+i},${'2026-10-'+String(10+i)},${'https://challonge.com/s'+i},24,1000)`;
    const add=async(member,points,winner)=>{for(let i=0;i<points.length;i++)await db`INSERT INTO tournament_results(stage_slug,source_key,display_name,member_id,swiss_wins,swiss_losses,final_rank,base_points,stage_points) VALUES(${'s'+(i+1)},${member??'unlinked'},'Result',${member},1,0,${winner===i?1:8},${points[i]},${points[i]})`};
    await add(a,[60,40,20],0);await add(b,[60,40,20],0);await add(c,[60,40,10,10],3);await add(d,[70,50],-1);await add(null,[999],-1);
    await db`INSERT INTO member_achievement_activity(member_id,kind) VALUES(${a},'login')`;
    await db`INSERT INTO member_achievement_profiles(member_id,showcase,title_id) VALUES(${a},'[]','winner'),(${f},'["welcome","winner"]','winner')`;
    const cookie=(await sessionCookie('member',a,new Request('http://localhost:3000'))).split(';')[0];
    const request=(url,auth=cookie)=>new Request('http://localhost:3000'+url,{headers:auth?{cookie:auth}:{}});
    const recorded=[];appDb.$client.options.debug=(_,query)=>{if(!query.includes('pg_catalog')&&!query.includes('pg_type'))recorded.push(query)};
    recorded.length=0;let response=await ranking(request('/api/guild/ranking'));assert.equal(response.status,200);
    assert.equal(recorded.length,3,'Ranking = one authorization + one aggregate + one opt-in cosmetics query');
    let data=await response.json(),byId=new Map(data.ranking.map(m=>[m.id,m]));
    assert.deepEqual(ids.map(id=>byId.get(id).rank),[1,1,3,4,5,6]);
    assert.deepEqual(byId.get(a).best,[60,40,20]);assert.deepEqual(byId.get(c).best,[60,40,10]);assert.equal(byId.get(c).stages,4);assert.equal(byId.get(d).stageWins,0);assert.deepEqual(byId.get(e).best,[]);
    assert.equal(byId.get(a).achievements.title,'Vincitore di tappa');assert.deepEqual(byId.get(f).achievements,{badgeIds:[],title:null},'A different member cannot inherit the first member’s facts');
    assert.equal(JSON.stringify(data).includes('private'),false);assert.equal(JSON.stringify(data).includes('password'),false);
    recorded.length=0;response=await champion(request('/api/guild/champion'));assert.equal(response.status,200);data=await response.json();
    assert.equal(recorded.length,2,'Champion = one authorization + one consistent snapshot SELECT, no transaction round-trips');assert.equal(data.champion.memberId,c);assert.equal(data.canUseThrone,false);
    recorded.length=0;assert.equal((await ranking(request('/api/guild/ranking',null))).status,401);assert.equal(recorded.length,0);
    await db`UPDATE members SET must_change_password=true WHERE id=${a}`;assert.equal((await ranking(request('/api/guild/ranking'))).status,403);
    await db`UPDATE members SET must_change_password=false,auth_version=auth_version+1 WHERE id=${a}`;
    assert.equal((await ranking(request('/api/guild/ranking'))).status,401);assert.equal((await champion(request('/api/guild/champion'))).status,401);
  }finally{
    if(appDb)await appDb.$client.end();if(db)await db.end();process.env.DATABASE_URL=previous;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();
  }
});
