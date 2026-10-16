import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
const {createAsyncCache}=await import('../app/lib/async-cache.ts');
const {SoundEngine}=await import('../app/lib/sound-engine.ts');
const {worldCamera,WALK_SPEED,INTERACTION_RADIUS}=await import('../app/lib/world-game.ts');
const {guildCamera,WORLD}=await import('../app/gilda/mappa/guild-world.ts');
const {CITY_START,CITY_ENTRANCES,canWalkCity,nearbyCityPlace}=await import('../app/lib/city-navigation.ts');

test('every city front door stays walkable and reachable with the same player footprint as the guild',()=>{
  for(const [id,point]of Object.entries(CITY_ENTRANCES)){assert.equal(canWalkCity(point.x,point.y),true,id);assert.equal(nearbyCityPlace(point.x,point.y),id);}
  const seen=new Set(),reached=new Set(),queue=[CITY_START];
  for(let i=0;i<queue.length&&reached.size<Object.keys(CITY_ENTRANCES).length;i++){
    const {x,y}=queue[i];const id=nearbyCityPlace(x,y);if(id)reached.add(id);
    for(const[dx,dy]of[[8,0],[-8,0],[0,8],[0,-8]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!seen.has(key)&&canWalkCity(nx,ny)){seen.add(key);queue.push({x:nx,y:ny});}}
  }
  assert.deepEqual([...reached].sort(),Object.keys(CITY_ENTRANCES).sort());
});

test('city and guild share camera scale, controls speed and interaction distance on desktop, mobile and landscape',()=>{
  assert.equal(WALK_SPEED,.19);assert.equal(INTERACTION_RADIUS,120);
  for(const [w,h]of [[1280,720],[390,844],[320,568],[844,390],[760,240]]){
    const player={x:800,y:620};const city=worldCamera(w,h,player,{width:1600,height:1100}),guild=guildCamera(w,h,player);
    assert.equal(city.scale,guild.scale);assert.deepEqual(guild,worldCamera(w,h,player,WORLD));
    assert.ok(Number.isFinite(guild.x)&&Number.isFinite(guild.y));
    assert.ok(city.scale>=.5&&city.scale<=1);
  }
});
test('cache coalesces concurrent requests, scopes identities, expires and never caches failure',async()=>{
  let clock=0,calls=0;const cache=createAsyncCache(4,()=>clock);
  const load=async()=>++calls;
  assert.deepEqual(await Promise.all([cache.get('a',100,load),cache.get('a',100,load)]),[1,1]);
  assert.equal(await cache.get('a',100,load),1);assert.equal(await cache.get('b',100,load),2);
  clock=101;assert.equal(await cache.get('a',100,load),3);
  await assert.rejects(cache.get('error',100,async()=>{throw Error('offline')}),/offline/);
  assert.equal(await cache.get('error',100,load),4);
  assert.equal(await cache.get('a',100,load,true),5,'Explicit refresh bypasses a fresh value');
});
test('invalidated or superseded requests cannot repopulate cache after logout or overwrite a fresh read',async()=>{
  const cache=createAsyncCache();let resolveOld;
  const old=cache.get('member',10000,()=>new Promise(resolve=>resolveOld=resolve));
  await Promise.resolve();cache.clear();
  assert.equal(await cache.get('member',10000,async()=>'new'),'new');resolveOld('old');await old;
  assert.equal(await cache.get('member',10000,async()=>'wrong'),'new');
  const bounded=createAsyncCache(2);let calls=0;const load=async()=>++calls;
  for(const key of ['a','b','c','a'])await bounded.get(key,10000,load);
  assert.equal(calls,4,'Bounded memory evicts the oldest entry');
});
test('every game sound creates a tone; clicks are deduplicated and mute/hidden/dispose suppress all sound',async()=>{
  let created=0,notes=[],hidden=false,closed=0;
  const context={state:'running',currentTime:0,destination:{},resume:async()=>{},close:async()=>closed++,createOscillator:()=>({type:'square',frequency:{setValueAtTime:(value)=>notes.push(value)},connect(){},start(){},stop(){}}),createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}})};
  const engine=new SoundEngine(()=>{created++;return context},()=>hidden);
  for(const kind of ['click','step','open','close','message','error'])await engine.play(kind);
  assert.equal(created,1,'One AudioContext is reused for the whole game');assert.deepEqual(notes,[740,92,523,784,659,220]);
  await engine.play('click');assert.equal(notes.length,6,'Manual and delegated click are one sound');
  engine.enabled=false;engine.tone(800,.1,.1);await engine.play('open');assert.equal(notes.length,6);
  engine.enabled=true;hidden=true;engine.tone(800,.1,.1);assert.equal(notes.length,6);
  hidden=false;engine.dispose();engine.tone(800,.1,.1);await engine.play('message');assert.equal(notes.length,6);assert.equal(closed,1);
});
test('private client cache shares album reads and notifications once, but clears and rejects old identity on account change',async()=>{
  const {getGameSession,getGameData,getAchievementAlbum,invalidateGameData}=await import('../app/lib/game-data.ts');
  const oldFetch=globalThis.fetch,oldWindow=globalThis.window;
  let current='A',calls=0,notifications=0,identityChanges=0;
  globalThis.window=new EventTarget();
  window.addEventListener('torino-achievements-unlocked',()=>notifications++);
  window.addEventListener('torino-session-changed',()=>identityChanges++);
  try{
    globalThis.fetch=async url=>{calls++;return Response.json(url.endsWith('/session')?{member:current?{id:current}:null}:url.endsWith('/achievements')?{newlyUnlocked:['welcome'],beycoins:{delta:10}}:{stages:[{name:current}]})};
    await Promise.all([getGameSession(),getGameSession()]);assert.equal(calls,1);
    await Promise.all([getAchievementAlbum('A'),getAchievementAlbum('A')]);await getAchievementAlbum('A');
    assert.equal(calls,2);assert.equal(notifications,1,'Cached album never repeats the achievement popup');
    assert.equal((await getGameData('/api/guild/stages','A')).stages[0].name,'A');
    assert.equal((await getGameData('/api/guild/stages','A')).stages[0].name,'A');assert.equal(calls,3);
    current='B';await getGameSession();assert.equal(identityChanges,1);
    await assert.rejects(getGameData('/api/guild/stages','A'),/sessione è cambiata/);
    await assert.rejects(getAchievementAlbum('A'),/sessione è cambiata/);
    assert.equal(calls,4,'Old identity is rejected before any further request');
    assert.equal((await getGameData('/api/guild/stages','B')).stages[0].name,'B');assert.equal(calls,5);
    current=null;await getGameSession();await assert.rejects(getGameData('/api/guild/stages','B'),/sessione è cambiata/);assert.equal(identityChanges,2);
  }finally{invalidateGameData();globalThis.fetch=oldFetch;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});
