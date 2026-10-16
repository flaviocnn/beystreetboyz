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
test('slot authenticates, spends atomically, replays safely, shares the achievement wallet, and isolates members',async()=>{
  const url=new URL(process.env.DATABASE_URL);assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  const name='tq_slot_test_'+randomBytes(8).toString('hex'),previous=process.env.DATABASE_URL;
  const admin=postgres(url.toString(),{max:1,prepare:false});let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);url.pathname='/'+name;db=postgres(url.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=url.toString();const {getDb}=await import('../db/index.ts');appDb=getDb();
    const endpoint=await import('../app/api/member/slot/route.ts'),achievements=await import('../app/api/member/achievements/route.ts');
    const {playSlot}=await import('../app/lib/slot-service.ts');
    const {sessionCookie}=await import('../app/lib/auth.ts');
    const a=randomUUID(),b=randomUUID(),poor=randomUUID();
    for(const id of[a,b,poor])await db`INSERT INTO members(id,first_name,password_salt,password_hash,created_at) VALUES(${id},${id},'salt','hash','2026-10-14')`;
    const cookie=async id=>(await sessionCookie('member',id,new Request('http://localhost:3000'))).split(';')[0];const ca=await cookie(a),cb=await cookie(b),cp=await cookie(poor);
    const request=(auth,method='POST',body={requestKey:randomUUID()},origin='http://localhost:3000')=>new Request('http://localhost:3000/api/member/slot',{method,headers:{origin,...(auth?{cookie:auth}:{}),'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
    assert.equal((await endpoint.GET(request(null,'GET'))).status,401);
    assert.equal((await endpoint.POST(request(null))).status,401);
    assert.equal((await endpoint.POST(request(ca,'POST',{},'https://hostile.invalid'))).status,403);
    for(const body of[{},null,{requestKey:'wrong'},{requestKey:randomUUID(),payout:100000},{requestKey:randomUUID(),memberId:b}])assert.equal((await endpoint.POST(request(ca,'POST',body))).status,400);
    assert.equal((await endpoint.POST(request(cp))).status,409,'insufficient funds cannot generate a paid spin');
    assert.equal((await db`SELECT count(*)::int n FROM beycoin_slot_spins`)[0].n,0);
    const sync=async auth=>{const r=await achievements.POST(request(auth));assert.equal(r.status,200);return r.json()};
    await sync(ca);await sync(cb);
    const key=randomUUID();const concurrent=await Promise.all([endpoint.POST(request(ca,'POST',{requestKey:key})),endpoint.POST(request(ca,'POST',{requestKey:key}))]);
    const [first,replay]=await Promise.all(concurrent.map(async r=>{assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);return r.json()}));
    assert.deepEqual(first,replay);assert.equal(first.balance,10-1+first.spin.payout);assert.equal(first.remaining,19);
    assert.equal((await db`SELECT count(*)::int n FROM beycoin_slot_spins WHERE member_id=${a}`)[0].n,1);
    assert.equal((await endpoint.POST(request(ca))).status,429,'server cooldown also applies across tabs');
    const album=await sync(ca);assert.equal(album.beycoins.balance,first.balance);assert.equal(album.beycoins.history.filter(m=>m.reason==='slot').length,1);
    assert.equal((await sync(cb)).beycoins.balance,10);
    const other=await (await endpoint.GET(request(cb,'GET'))).json();assert.equal(other.history.length,0);assert.equal(other.remaining,20);
    // Same idempotency key is scoped to each member, not a cross-account result oracle.
    assert.equal((await endpoint.POST(request(cb,'POST',{requestKey:key}))).status,200);
    await assert.rejects(db`INSERT INTO beycoin_slot_spins(id,member_id,request_key,reels,cost,payout,game_day) VALUES(${randomUUID()},${a},${randomUUID()},'[0,0,0]',1,999,current_date)`,error=>error.code==='23514');
    // Seed valid historic losses to exercise daily limit without sleeping or spending production currency.
    for(let i=0;i<19;i++)await db`INSERT INTO beycoin_slot_spins(id,member_id,request_key,reels,cost,payout,game_day,created_at) VALUES(${randomUUID()},${a},${randomUUID()},'[0,1,2]',1,0,(clock_timestamp() AT TIME ZONE 'Europe/Rome')::date,clock_timestamp()-interval '5 seconds')`;
    assert.equal((await endpoint.POST(request(ca))).status,429);
    const retry=await endpoint.POST(request(ca,'POST',{requestKey:key}));assert.equal(retry.status,200,'recovery succeeds even with daily limit or negative corrected balance');assert.equal((await retry.json()).spin.id,first.spin.id);
    // Two simultaneous distinct keys cannot both spend the last coin, even in different processes.
    const last=randomUUID();await db`INSERT INTO members(id,first_name,password_salt,password_hash,created_at) VALUES(${last},'Last','salt','hash','2026-10-14')`;
    await db`INSERT INTO member_achievements(member_id,achievement_id,active,evidence,coin_reward,coin_credited,coin_revision) VALUES(${last},'welcome',true,'{}',1,true,1)`;
    await db`INSERT INTO beycoin_ledger(id,member_id,achievement_id,revision,amount,reason) VALUES(${randomUUID()},${last},'welcome',1,1,'award')`;
    const attempts=await Promise.allSettled([playSlot(last,randomUUID()),playSlot(last,randomUUID())]);
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
    const lastState=await (await endpoint.GET(request(await cookie(last),'GET'))).json();assert.ok(lastState.balance>=0);assert.equal(lastState.history.length,1);
    await db`UPDATE members SET must_change_password=true WHERE id=${b}`;
    assert.equal((await endpoint.GET(request(cb,'GET'))).status,403);assert.equal((await endpoint.POST(request(cb))).status,403);
  }finally{
    if(appDb)await appDb.$client.end();if(db)await db.end();process.env.DATABASE_URL=previous;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();
  }
});
