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
test('blackjack hides cards, resumes hands, serializes actions, pays once and shares the arcade wallet and daily limit',async()=>{
  const url=new URL(process.env.DATABASE_URL);assert.ok(['127.0.0.1','localhost'].includes(url.hostname));
  const name='tq_blackjack_test_'+randomBytes(8).toString('hex'),previous=process.env.DATABASE_URL;
  const admin=postgres(url.toString(),{max:1,prepare:false});let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);url.pathname='/'+name;db=postgres(url.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=url.toString();const {getDb}=await import('../db/index.ts');appDb=getDb();
    const endpoint=await import('../app/api/member/blackjack/route.ts'),achievements=await import('../app/api/member/achievements/route.ts');
    const {playBlackjack}=await import('../app/lib/blackjack-service.ts'),{playSlot,slotState}=await import('../app/lib/slot-service.ts');
    const {sessionCookie}=await import('../app/lib/auth.ts'),{dealBlackjack}=await import('../app/lib/blackjack.ts');
    const a=randomUUID(),b=randomUUID(),poor=randomUUID(),quota=randomUUID();
    for(const id of[a,b,poor,quota])await db`INSERT INTO members(id,first_name,password_salt,password_hash,created_at) VALUES(${id},${id},'salt','hash','2026-10-14')`;
    const cookie=async id=>(await sessionCookie('member',id,new Request('http://localhost:3000'))).split(';')[0];const ca=await cookie(a),cb=await cookie(b),cp=await cookie(poor);
    const request=(auth,method='POST',body={requestKey:randomUUID(),action:'start'},origin='http://localhost:3000')=>new Request('http://localhost:3000/api/member/blackjack',{method,headers:{origin,...(auth?{cookie:auth}:{}),'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
    const sync=async auth=>{const r=await achievements.POST(request(auth));assert.equal(r.status,200);return r.json()};
    assert.equal((await endpoint.GET(request(null,'GET'))).status,401);assert.equal((await endpoint.POST(request(null))).status,401);
    assert.equal((await endpoint.POST(request(ca,'POST',{},'https://hostile.invalid'))).status,403);
    for(const body of[null,{}, {requestKey:randomUUID(),action:'start',payout:999},{requestKey:randomUUID(),action:'hit',handId:a,version:-1}])assert.equal((await endpoint.POST(request(ca,'POST',body))).status,400);
    assert.equal((await endpoint.POST(request(cp))).status,409);
    await sync(ca);await sync(cb);await sync(await cookie(quota));
    const input={requestKey:randomUUID(),action:'start'};
    const results=await Promise.all([endpoint.POST(request(ca,'POST',input)),endpoint.POST(request(ca,'POST',input))]);
    const [first,replay]=await Promise.all(results.map(async r=>{assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);return r.json()}));
    assert.deepEqual(first,replay);assert.equal(first.remaining,19);assert.equal(first.balance,10-2+first.hand.payout);
    assert.equal((await db`SELECT count(*)::int n FROM beycoin_blackjack_hands WHERE member_id=${a}`)[0].n,1);
    assert.equal(JSON.stringify(first).includes('"deck"'),false);assert.equal(JSON.stringify(first).includes('"cursor"'),false);
    // Deterministic shoes are installed only in this throwaway local DB.
    const shoe=(...start)=>[...start,...Array.from({length:52},(_,i)=>i).filter(x=>!start.includes(x))];
    async function fixture(id,cards){const hand=dealBlackjack(cards);assert.equal(hand.status,'playing');await db`UPDATE beycoin_blackjack_hands SET deck=${db.json(cards)},player=${db.json(hand.player)},dealer=${db.json(hand.dealer)},cursor=4,status='playing',payout=0,version=0,finished_at=NULL WHERE id=${id}`;}
    await fixture(first.hand.id,shoe(4,9,5,7,2));
    const resumed=await (await endpoint.GET(request(ca,'GET'))).json();assert.equal(resumed.hand.id,first.hand.id);assert.deepEqual(resumed.hand.dealer,[9,null]);assert.equal(resumed.hand.dealerTotal,null);assert.equal(resumed.balance,8);
    assert.equal((await endpoint.POST(request(ca))).status,409,'cannot abandon an active hand to start another');
    assert.equal((await endpoint.POST(request(cb,'POST',{requestKey:randomUUID(),action:'stand',handId:first.hand.id,version:0}))).status,409,'cannot act on another wallet');
    const hit={requestKey:randomUUID(),action:'hit',handId:first.hand.id,version:0};
    const hits=await Promise.all([endpoint.POST(request(ca,'POST',hit)),endpoint.POST(request(ca,'POST',hit))]);
    const hitData=await Promise.all(hits.map(async r=>{assert.equal(r.status,200);return r.json()}));assert.deepEqual(hitData[0],hitData[1]);assert.equal(hitData[0].hand.player.length,3);assert.equal(hitData[0].hand.version,1);
    assert.equal((await endpoint.POST(request(ca,'POST',{...hit,requestKey:randomUUID()}))).status,409,'stale version cannot draw again');
    assert.equal((await endpoint.POST(request(ca,'POST',{...hit,action:'stand'}))).status,400,'one key cannot name two different actions');
    const stand={requestKey:randomUUID(),action:'stand',handId:first.hand.id,version:1};
    const finished=await Promise.all([endpoint.POST(request(ca,'POST',stand)),endpoint.POST(request(ca,'POST',stand))]);
    const settled=await Promise.all(finished.map(async r=>{assert.equal(r.status,200);return r.json()}));assert.deepEqual(settled[0],settled[1]);assert.equal(settled[0].hand.status,'lost');assert.equal(settled[0].balance,8);
    let album=await sync(ca);assert.equal(album.beycoins.balance,8);assert.equal(album.beycoins.history.filter(m=>m.reason==='blackjack').length,1);
    assert.equal((await sync(cb)).beycoins.balance,10);
    const second=await (await endpoint.POST(request(ca))).json();await fixture(second.hand.id,shoe(9,0,7,5));
    const winAction={requestKey:randomUUID(),action:'stand',handId:second.hand.id,version:0};
    const won=await (await endpoint.POST(request(ca,'POST',winAction))).json();assert.equal(won.hand.status,'won');assert.equal(won.balance,10);
    assert.equal((await (await endpoint.POST(request(ca,'POST',winAction))).json()).balance,10,'recovery cannot double-credit a win');
    // Shared daily cap also serializes a slot spin racing a blackjack deal.
    for(let i=0;i<19;i++)await db`INSERT INTO beycoin_slot_spins(id,member_id,request_key,reels,cost,payout,game_day,created_at) VALUES(${randomUUID()},${quota},${randomUUID()},'[0,0,1]',1,1,(clock_timestamp() AT TIME ZONE 'Europe/Rome')::date,clock_timestamp()-interval '5 seconds')`;
    const race=await Promise.allSettled([playSlot(quota,randomUUID()),playBlackjack(quota,{action:'start',requestKey:randomUUID()})]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal((await slotState(quota)).remaining,0);
    const [activeQuota]=await db`SELECT * FROM beycoin_blackjack_hands WHERE member_id=${quota} AND status='playing'`;
    if(activeQuota)await playBlackjack(quota,{action:'stand',requestKey:randomUUID(),handId:activeQuota.id,version:activeQuota.version});
    // An in-progress hand remains finishable after quota exhaustion or balance corrections.
    const third=await (await endpoint.POST(request(ca))).json();await fixture(third.hand.id,shoe(9,0,7,5));
    for(let i=0;i<17;i++)await db`INSERT INTO beycoin_slot_spins(id,member_id,request_key,reels,cost,payout,game_day,created_at) VALUES(${randomUUID()},${a},${randomUUID()},'[0,1,2]',1,0,(clock_timestamp() AT TIME ZONE 'Europe/Rome')::date,clock_timestamp()-interval '5 seconds')`;
    const finishOverQuota=await endpoint.POST(request(ca,'POST',{action:'stand',requestKey:randomUUID(),handId:third.hand.id,version:0}));assert.equal(finishOverQuota.status,200);assert.equal((await finishOverQuota.json()).remaining,0);
    await db`UPDATE members SET must_change_password=true WHERE id=${b}`;assert.equal((await endpoint.GET(request(cb,'GET'))).status,403);assert.equal((await endpoint.POST(request(cb))).status,403);
    const [rls]=await db`SELECT count(*)::int n FROM pg_tables WHERE tablename IN ('beycoin_blackjack_hands','beycoin_blackjack_actions') AND rowsecurity`;assert.equal(rls.n,2);
  }finally{
    if(appDb)await appDb.$client.end();if(db)await db.end();process.env.DATABASE_URL=previous;
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);await admin.end();
  }
});
