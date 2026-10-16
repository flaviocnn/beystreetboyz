import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.ts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return{url:url.href,shortCircuit:true};}throw error;}
}});
test('authenticated achievement lifecycle, idempotence, self-declared decks, corrections, privacy and local isolation',async()=>{
  const url=new URL(process.env.DATABASE_URL);assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  const name='tq_achievement_test_'+randomBytes(8).toString('hex'),previous=process.env.DATABASE_URL;
  const admin=postgres(url.toString(),{max:1,prepare:false});let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);url.pathname='/'+name;db=postgres(url.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=url.toString();const {getDb}=await import('../db/index.ts');appDb=getDb();
    const endpoint=await import('../app/api/member/achievements/route.ts'),avatar=await import('../app/api/member/avatar/route.ts');
    const {sessionCookie}=await import('../app/lib/auth.ts');const {publicAchievementShowcases}=await import('../app/lib/achievement-service.ts');
    const a=randomUUID(),b=randomUUID();
    await db`INSERT INTO members(id,first_name,password_salt,password_hash,created_at,email) VALUES(${a},'A','salt','hash','2026-10-14','private@example.invalid'),(${b},'B','salt','hash','2026-10-14','other@example.invalid')`;
    const cookie=async id=>(await sessionCookie('member',id,new Request('http://localhost:3000'))).split(';')[0];const ca=await cookie(a),cb=await cookie(b);
    const request=(auth,method='POST',body,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/member/achievements',{method,headers:{origin,...(auth?{cookie:auth}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const sync=async auth=>{const r=await endpoint.POST(request(auth));assert.equal(r.status,200);return r.json();};
    assert.equal((await endpoint.POST(request(null))).status,401);
    assert.equal((await endpoint.POST(request(ca,'POST',null,'https://hostile.invalid'))).status,403);
    let album=await sync(ca);assert.deepEqual(album.newlyUnlocked,['welcome']);assert.equal(JSON.stringify(album).includes('private@'),false);
    assert.deepEqual((await sync(ca)).newlyUnlocked,[]);
    const noop=await avatar.PUT(request(ca,'PUT',{avatarStyle:0,avatarColor:0}));assert.equal(noop.status,200);assert.equal((await sync(ca)).achievements.find(x=>x.id==='identity').qualified,false);
    assert.equal((await avatar.PUT(request(ca,'PUT',{avatarStyle:1,avatarColor:2}))).status,200);assert.equal((await sync(ca)).achievements.find(x=>x.id==='identity').qualified,true);
    const part=value=>({value,custom:false}),bey=bit=>({blades:[part('Wizard Rod')],ratchet:part('9-60'),bit:part(bit)}),attack=['Flat','Rush','Low Flat'].map(bey);
    await db`INSERT INTO tournament_stages(slug,name,event_date,source_url,attendance,coefficient_milli) VALUES('first','First stage','2026-10-14','https://challonge.com/first',24,1000)`;
    await db`INSERT INTO tournament_results(stage_slug,source_key,display_name,member_id,swiss_wins,swiss_losses,final_rank,base_points,stage_points) VALUES('first','a','A',${a},5,0,1,100,100)`;
    await db`INSERT INTO stage_decks(stage_slug,member_id,beys) VALUES('first',${a},${db.json(attack)})`;
    const concurrent=await Promise.all([sync(ca),sync(ca)]);assert.equal(concurrent.flatMap(x=>x.newlyUnlocked).filter(x=>x==='attack').length,1);
    album=await sync(ca);assert.equal(album.achievements.find(x=>x.id==='attack').qualified,true);
    let r=await endpoint.PUT(request(ca,'PUT',{showcase:['welcome','attack'],titleId:'winner'}));assert.equal(r.status,200);
    let publicProfiles=await publicAchievementShowcases();assert.deepEqual(publicProfiles.get(a).badgeIds,['welcome','attack']);assert.equal(publicProfiles.get(a).title,'Vincitore di tappa');
    assert.equal((await endpoint.PUT(request(cb,'PUT',{showcase:['attack'],titleId:null}))).status,400);
    assert.equal((await endpoint.PUT(request(ca,'PUT',{showcase:['welcome','welcome'],titleId:null}))).status,400);
    assert.equal((await endpoint.PUT(request(ca,'PUT',{showcase:['welcome'],titleId:'attack'}))).status,400);
    const mixed=attack.map((b,i)=>i===2?{...b,bit:part('Ball')}:b);
    await db`UPDATE stage_decks SET beys=${db.json(mixed)},version=2 WHERE member_id=${a}`;
    publicProfiles=await publicAchievementShowcases();assert.deepEqual(publicProfiles.get(a).badgeIds,['welcome'],'public display revalidates even before owner opens the album');
    album=await sync(ca);assert.equal(album.achievements.find(x=>x.id==='attack').qualified,false);assert.deepEqual(album.showcase,['welcome']);
    const [audit]=await db`SELECT count(*)::integer n FROM member_achievement_audit WHERE member_id=${a} AND achievement_id='attack' AND action='revoke'`;assert.equal(audit.n,1);
    await sync(ca);const [same]=await db`SELECT count(*)::integer n FROM member_achievement_audit WHERE member_id=${a} AND achievement_id='attack' AND action='revoke'`;assert.equal(same.n,1);
    await db`UPDATE stage_decks SET beys=${db.json(attack)},version=3 WHERE member_id=${a}`;assert.ok((await sync(ca)).newlyUnlocked.includes('attack'));
    await db`UPDATE tournament_results SET final_rank=2 WHERE member_id=${a}`;album=await sync(ca);assert.equal(album.achievements.find(x=>x.id==='winner').qualified,false);assert.equal(album.achievements.find(x=>x.id==='attack').qualified,false);assert.equal(album.titleId,null);
    await db`UPDATE members SET must_change_password=true WHERE id=${b}`;assert.equal((await endpoint.POST(request(cb))).status,403);
  }finally{
    if(appDb)await appDb.$client.end();if(db)await db.end();process.env.DATABASE_URL=previous;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();
  }
});
