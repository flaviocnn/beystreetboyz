import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(s,c,n){
  if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  try{return n(s,c)}catch(e){if(s.startsWith('.')&&c.parentURL?.startsWith('file:'))for(const suffix of ['.ts','/index.ts']){
    const u=new URL(s+suffix,c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true};
  }throw e;}
}});

test('personal stage archive: ownership, top8, versioned decks and safe result reimports',async()=>{
  const url=new URL(process.env.DATABASE_URL);assert.ok(['localhost','127.0.0.1'].includes(url.hostname),'Local test database required');
  const name='tq_decks_test_'+randomBytes(8).toString('hex'),oldUrl=process.env.DATABASE_URL;
  const admin=postgres(url.toString(),{max:1,prepare:false});let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);url.pathname='/'+name;process.env.DATABASE_URL=url.toString();
    db=postgres(url.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const f of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(f,dir),'utf8'));
    const {getDb}=await import('../db/index.ts');appDb=getDb();
    const {sessionCookie}=await import('../app/lib/auth.ts');
    const {GET}=await import('../app/api/guild/stages/route.ts');
    const {PUT}=await import('../app/api/guild/stages/[slug]/deck/route.ts');
    const base='http://localhost:3000',a=randomUUID(),b=randomUUID();
    for(const id of [a,b])await db`INSERT INTO members(id,first_name,password_salt,password_hash,created_at) VALUES(${id},'Fixture','s','h','2026-10-16')`;
    const memberCookie=async(id,version=0,method='password')=>(await sessionCookie('member',id,new Request(base),version,method)).split(';')[0];
    const cookie=await memberCookie(a),other=await memberCookie(b),staff=(await sessionCookie('staff','staff',new Request(base))).split(';')[0];
    const req=(method,body,auth=cookie,origin=base)=>new Request(base+'/api/guild/stages',{method,headers:{origin,...(auth?{cookie:auth}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const ctx=slug=>({params:Promise.resolve({slug})});
    const save=(slug,body,auth=cookie,origin=base)=>PUT(req('PUT',body,auth,origin),ctx(slug));
    const result=async(slug,memberId,rank)=>db`INSERT INTO tournament_results(stage_slug,source_key,display_name,member_id,swiss_wins,swiss_losses,final_rank,base_points,stage_points) VALUES(${slug},${memberId},'Fixture',${memberId},3,2,${rank},10,10)`;
    for(const [slug,memberId,rank,date] of [['first',a,1,'2026-10-01'],['eighth',a,8,'2026-10-08'],['outside',a,null,'2026-10-15'],['other',b,1,'2026-10-16']]){
      await db`INSERT INTO tournament_stages(slug,name,event_date,source_url,attendance,coefficient_milli) VALUES(${slug},${slug},${date},'https://challonge.com/fixture',24,900)`;
      await result(slug,memberId,rank);
    }
    const get=async(auth=cookie)=>{const r=await GET(req('GET',null,auth));return{status:r.status,...await r.json()}};
    assert.equal((await get(null)).status,401);assert.equal((await get(staff)).status,401);
    let data=await get();assert.deepEqual(data.stages.map(s=>s.slug),['outside','eighth','first']);
    assert.equal(data.stages[0].eligible,false);assert.equal(data.stages[0].finalRank,null);assert.equal(data.stages[1].eligible,true);
    const part=value=>({value,custom:false}),bey=()=>({blades:[part('Wizard Rod')],ratchet:part('9-60'),bit:part('Ball')});
    const deck=[bey(),bey(),bey()],body={deck,version:0};
    assert.equal((await save('first',body,cookie,'https://evil.example')).status,403);
    assert.equal((await save('first',body,other)).status,404);
    assert.equal((await save('other',body)).status,404);
    assert.equal((await save('outside',body)).status,403);
    assert.equal((await save('first',{...body,deck:deck.slice(0,2)})).status,400);
    assert.equal((await save('first',{...body,version:-1})).status,400);
    let r=await save('first',body);assert.equal(r.status,200);assert.equal((await r.json()).version,1);
    assert.equal((await save('first',body)).status,409);
    const parallel=await Promise.all([save('first',{deck,version:1}),save('first',{deck,version:1})]);
    assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);
    assert.equal((await save('eighth',body)).status,200);
    assert.equal((await db`SELECT count(*)::int n FROM stage_decks`)[0].n,2);
    assert.equal((await get(other)).stages.length,1);assert.equal((await get(other)).stages[0].deck,null);
    await db`DELETE FROM tournament_results WHERE stage_slug='first'`;await result('first',a,1);
    data=await get();assert.equal(data.stages.find(s=>s.slug==='first').version,2,'Deck survives delete/insert result reimport');
    await db`UPDATE tournament_results SET final_rank=NULL WHERE stage_slug='first'`;
    assert.equal((await save('first',{deck,version:2})).status,403);
    data=await get();assert.ok(data.stages.find(s=>s.slug==='first').deck);assert.equal(data.stages.find(s=>s.slug==='first').eligible,false);
    await db`UPDATE members SET must_change_password=true WHERE id=${a}`;
    assert.equal((await get()).status,403);assert.equal((await save('eighth',{deck,version:1})).status,403);
    const oauth=await memberCookie(a,0,'challonge');assert.equal((await get(oauth)).status,200);
    await db`UPDATE members SET auth_version=1 WHERE id=${a}`;assert.equal((await get(oauth)).status,401);
    await db`DELETE FROM members WHERE id=${a}`;assert.equal((await db`SELECT count(*)::int n FROM stage_decks`)[0].n,0);
  }finally{
    process.env.DATABASE_URL=oldUrl;if(appDb)await appDb.$client.end();if(db)await db.end();
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
  }
});
