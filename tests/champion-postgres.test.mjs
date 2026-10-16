import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  try{return next(specifier,context);}catch(error){
    if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.ts','/index.ts']){
      const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return{url:url.href,shortCircuit:true};
    }throw error;
  }
}});

test('the latest played stage owns the throne; next check-in and old reimports do not revoke it',async()=>{
  const localUrl=new URL(process.env.DATABASE_URL);assert.ok(['127.0.0.1','localhost'].includes(localUrl.hostname));
  const name='tq_champion_test_'+randomBytes(8).toString('hex');
  const admin=postgres(localUrl.toString(),{max:1,prepare:false});
  const previous=process.env.DATABASE_URL;let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);localUrl.pathname='/'+name;
    db=postgres(localUrl.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=localUrl.toString();
    const {getDb}=await import('../db/index.ts');appDb=getDb();
    const {GET}=await import('../app/api/guild/champion/route.ts');
    const {sessionCookie}=await import('../app/lib/auth.ts');
    const a=randomUUID(),b=randomUUID();
    await db`INSERT INTO members(id,first_name,challonge_username,avatar_style,avatar_color,password_salt,password_hash,created_at,email) VALUES(${a},'First','winner_A',7,2,'salt','hash','2026-10-14','private@example.invalid'),(${b},'Second','winner_B',3,4,'salt','hash','2026-10-14','private2@example.invalid')`;
    const cookie=async id=>(await sessionCookie('member',id,new Request('http://localhost:3000'))).split(';')[0];
    const ca=await cookie(a),cb=await cookie(b);
    const request=auth=>new Request('http://localhost:3000/api/guild/champion',{headers:auth?{cookie:auth}:{}});
    const read=async auth=>{const r=await GET(request(auth));return {status:r.status,data:await r.json()};};
    assert.equal((await read()).status,401);
    assert.deepEqual((await read(ca)).data,{champion:null,canUseThrone:false});
    const stage=async(slug,date)=>db`INSERT INTO tournament_stages(slug,name,event_date,source_url,attendance,coefficient_milli) VALUES(${slug},${'Stage '+slug},${date},${'https://challonge.com/'+slug},24,1000)`;
    const result=async(slug,key,member,rank)=>db`INSERT INTO tournament_results(stage_slug,source_key,display_name,member_id,swiss_wins,swiss_losses,final_rank,base_points,stage_points) VALUES(${slug},${key},${key},${member},5,0,${rank},100,100)`;
    await stage('first','2026-10-14');await result('first','a',a,1);await result('first','b',b,2);
    const part=value=>({value,custom:false});const bey={blades:[part('Wizard Rod')],ratchet:part('9-60'),bit:part('Ball')};
    await db`INSERT INTO stage_decks(stage_slug,member_id,beys) VALUES('first',${a},${db.json([bey,bey,bey])})`;
    let data=(await read(ca)).data;
    assert.equal(data.canUseThrone,true);assert.equal(data.champion.memberId,a);assert.equal(data.champion.displayName,'winner_A');
    assert.equal(data.champion.avatarStyle,7);assert.equal(data.champion.deck.length,3);
    assert.equal(JSON.stringify(data).includes('private@example'),false);
    assert.equal((await read(cb)).data.canUseThrone,false);
    await db`INSERT INTO checkin_events(id,tournament_id,tournament_ref,source_url,name,event_date,fee_cents,last_synced_at) VALUES(${randomUUID()},'900','upcoming','https://challonge.com/upcoming','Upcoming','2026-10-21',300,now())`;
    await stage('second','2026-10-21');
    assert.equal((await read(ca)).data.canUseThrone,true,'Upcoming/empty stages cannot dethrone the champion');
    await result('second','b',b,1);
    assert.equal((await read(ca)).data.canUseThrone,false);assert.equal((await read(cb)).data.canUseThrone,true);
    assert.equal((await read(cb)).data.champion.stage.slug,'second');
    await db`UPDATE tournament_stages SET synced_at=now()+interval '1 day' WHERE slug='first'`;
    assert.equal((await read(cb)).data.champion.stage.slug,'second','Resync date is not the stage date');
    await result('second','a',a,1);
    assert.deepEqual((await read(ca)).data,{champion:null,canUseThrone:false},'Ambiguous winners grant nobody the special portrait');
    await db`DELETE FROM tournament_results WHERE stage_slug='second' AND source_key='a'`;
    await db`UPDATE tournament_results SET final_rank=2 WHERE stage_slug='second'`;
    assert.equal((await read(cb)).data.champion,null,'No stale prior champion after importing next-stage results without a winner');
    await db`UPDATE members SET must_change_password=true WHERE id=${a}`;
    assert.equal((await read(ca)).status,403);
  }finally{
    if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;
    if(appDb)await appDb.$client.end();if(db)await db.end();
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
  }
});
