import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(s,c,next){if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};try{return next(s,c)}catch(e){if(s.startsWith('.'))for(const ext of ['.ts','/index.ts']){const u=new URL(s+ext,c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
test('only Alebuck receives the manual achievement; both skins are server-gated and rewards cannot be farmed',async()=>{
  const url=new URL(process.env.DATABASE_URL);assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  const admin=postgres(url.toString(),{max:1,prepare:false}),name='tq_manual_'+randomBytes(8).toString('hex'),previous=process.env.DATABASE_URL;let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);url.pathname='/'+name;db=postgres(url.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);for(const f of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(f,dir),'utf8'));
    process.env.DATABASE_URL=url.toString();const {getDb}=await import('../db/index.ts');appDb=getDb();
    const avatar=await import('../app/api/member/avatar/route.ts'),albumApi=await import('../app/api/member/achievements/route.ts');
    const {sessionCookie}=await import('../app/lib/auth.ts'),{publicAchievementShowcases}=await import('../app/lib/achievement-service.ts');
    const a=randomUUID(),b=randomUUID();
    await db`INSERT INTO members(id,first_name,challonge_username,password_salt,password_hash,created_at,avatar_style,avatar_color) VALUES(${a},'A','Alebuck','salt','hash','2026-10-17',11,2),(${b},'B','Other','salt','hash','2026-10-17',23,3)`;
    const cookie=async id=>(await sessionCookie('member',id,new Request('http://localhost:3000'))).split(';')[0];const ca=await cookie(a),cb=await cookie(b);
    const req=(auth,method='GET',body)=>new Request('http://localhost:3000/api/member/avatar',{method,headers:{origin:'http://localhost:3000',...(auth?{cookie:auth}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const sync=async auth=>{const r=await albumApi.POST(req(auth,'POST'));assert.equal(r.status,200);return r.json()};
    assert.equal((await avatar.GET(req(null))).status,401);
    assert.equal((await (await avatar.GET(req(ca))).json()).demonUnlocked,false,'even the name Alebuck cannot grant access by itself');
    for(const style of[11,23])assert.equal((await avatar.PUT(req(cb,'PUT',{avatarStyle:style,avatarColor:1}))).status,403);
    const forged=await albumApi.POST(req(cb,'POST',{manualAchievements:['demon-slayer'],achievementId:'demon-slayer',active:true}));
    assert.equal((await forged.json()).achievements.find(a=>a.id==='demon-slayer').qualified,false);
    const operation=await readFile(new URL('../ops/grant-demon-to-alebuck.sql',import.meta.url),'utf8');await db.begin(tx=>tx.unsafe(operation));
    const repaired=await db`SELECT id,avatar_style,avatar_color FROM members ORDER BY id`;
    assert.equal(repaired.find(m=>m.id===a).avatar_style,11);assert.equal(repaired.find(m=>m.id===b).avatar_style,12);assert.equal(repaired.find(m=>m.id===b).avatar_color,3);
    let album=await sync(ca);assert.equal(album.beycoins.balance,60);assert.equal(album.achievements.find(a=>a.id==='demon-slayer').qualified,true);
    assert.equal((await (await avatar.GET(req(ca))).json()).demonUnlocked,true);assert.equal((await (await avatar.GET(req(cb))).json()).demonUnlocked,false);
    for(const style of[11,23])assert.equal((await avatar.PUT(req(ca,'PUT',{avatarStyle:style,avatarColor:2}))).status,200);
    await db.begin(tx=>tx.unsafe(operation));await sync(ca);await sync(ca);
    const [reward]=await db`SELECT count(*)::int n,sum(amount)::int total FROM beycoin_ledger WHERE member_id=${a} AND achievement_id='demon-slayer'`;assert.equal(reward.n,1);assert.equal(reward.total,50);
    const [evidence]=await db`SELECT evidence FROM member_achievements WHERE member_id=${a} AND achievement_id='demon-slayer'`;assert.equal(evidence.evidence.manual,true,'reconciliation must preserve manual provenance');
    assert.equal((await albumApi.PUT(req(cb,'PUT',{showcase:['demon-slayer'],titleId:null}))).status,400);
    assert.equal((await albumApi.PUT(req(ca,'PUT',{showcase:['demon-slayer'],titleId:null}))).status,200);
    assert.deepEqual((await publicAchievementShowcases()).get(a).badgeIds,['demon-slayer']);
    await db`UPDATE member_achievements SET active=false WHERE member_id=${a} AND achievement_id='demon-slayer'`;
    assert.equal((await avatar.PUT(req(ca,'PUT',{avatarStyle:23,avatarColor:2}))).status,403);
    album=await sync(ca);assert.equal(album.achievements.find(a=>a.id==='demon-slayer').qualified,false);assert.deepEqual(album.showcase,[]);
    assert.equal((await publicAchievementShowcases()).get(a)?.badgeIds.includes('demon-slayer')??false,false);
    await db`UPDATE members SET must_change_password=true WHERE id=${b}`;assert.equal((await avatar.GET(req(cb))).status,403);
  }finally{
    if(appDb)await appDb.$client.end();if(db)await db.end();process.env.DATABASE_URL=previous;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();
  }
});
