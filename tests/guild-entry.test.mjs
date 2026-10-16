import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGuildEntry} from '../app/lib/guild-entry.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const fixture=(overrides={})=>({
  session:async()=>({member:{id:'a',mustChangePassword:false}}),ranking:async()=>({ranking:[]}),
  access:()=>{},ranked:()=>{},accessError:()=>{},rankingError:()=>{},passwordRequired:()=>{},active:()=>true,...overrides,
});
test('the guild becomes playable immediately after verified access, without waiting for slow ranking',async()=>{
  let release,rankingStarted=false;const events=[];
  const pending=new Promise(resolve=>release=resolve);
  await loadGuildEntry(fixture({ranking:()=>{rankingStarted=true;return pending},access:member=>events.push('room:'+member.id),ranked:()=>events.push('ranking')}));
  assert.equal(rankingStarted,true);assert.deepEqual(events,['room:a'],'The entry promise resolves while optional metadata is still pending');
  release({ranking:[]});await tick();assert.deepEqual(events,['room:a','ranking']);
});
test('a ranking outage never closes the room or becomes an access error',async()=>{
  const events=[];
  await loadGuildEntry(fixture({access:()=>events.push('room'),ranking:async()=>{throw Error('ranking offline')},accessError:()=>events.push('denied'),rankingError:()=>events.push('ranking-error')}));
  await tick();assert.deepEqual(events,['room','ranking-error']);
});
test('guest, password change, failed access and unmounted pages never start optional guild queries',async()=>{
  for(const scenario of ['guest','password','failure','unmounted']){
    const events=[];
    await loadGuildEntry(fixture({session:async()=>{if(scenario==='failure')throw Error('offline');return{member:scenario==='guest'?null:{id:'a',mustChangePassword:scenario==='password'}}},
      active:()=>scenario!=='unmounted',ranking:async()=>{events.push('ranking')},access:m=>events.push(m?'room':'guest'),passwordRequired:()=>events.push('password'),accessError:()=>events.push('error')}));
    await tick();assert.deepEqual(events,{guest:['guest'],password:['password'],failure:['error'],unmounted:[]}[scenario]);
  }
  let active=true,started=false;
  await loadGuildEntry(fixture({active:()=>active,access:()=>{active=false},ranking:async()=>{started=true}}));
  await tick();assert.equal(started,false,'Leaving immediately after access must not enqueue an unused query');
});
