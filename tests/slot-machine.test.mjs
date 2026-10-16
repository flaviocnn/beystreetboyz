import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
const {slotPayout,validSlotKey,SLOT_COST,SLOT_DAILY_LIMIT,SLOT_SYMBOLS}=await import('../app/lib/slot-machine.ts');
test('slot enumerates every equally likely outcome: exact odds, cost and 93.75% theoretical return',()=>{
  assert.equal(SLOT_COST,1);assert.equal(SLOT_DAILY_LIMIT,20);assert.equal(SLOT_SYMBOLS.length,4);
  const frequencies=new Map();let payout=0;
  for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++){
    const reward=slotPayout([a,b,c]);payout+=reward;frequencies.set(reward,(frequencies.get(reward)??0)+1);
  }
  assert.deepEqual(Object.fromEntries(frequencies),{0:24,1:36,4:3,12:1});
  assert.equal(payout/64,.9375);
  for(const reels of [[-1,0,0],[4,0,0],[1.5,0,0],[NaN,0,0]])assert.throws(()=>slotPayout(reels));
});
test('only random UUIDv4 request keys are accepted; no client amounts, results or identities',()=>{
  assert.equal(validSlotKey('7ed557b5-30dc-4779-8c05-a97a607b4f91'),true);
  for(const key of [null,1,{},'','a'.repeat(100),'../../other','7ed557b5-30dc-1779-8c05-a97a607b4f91'])assert.equal(validSlotKey(key),false);
});
test('recovery survives remount/reload, disabled storage, stale responses and a displayed key already cleared in storage',async()=>{
  const {createSlotRecovery}=await import('../app/lib/slot-recovery.ts');
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const key='7ed557b5-30dc-4779-8c05-a97a607b4f91',next='7ed557b5-30dc-4779-8c05-a97a607b4f92';
  const r=createSlotRecovery(()=>storage);r.remember('A',key);
  assert.equal(r.get('B'),null);assert.equal(createSlotRecovery(()=>storage).get('A'),key);
  const displayed=r.get('A');r.clear('A',key);
  assert.equal(r.requestKey('A',displayed,()=>{throw Error('Must not start a new round')}),key);
  r.remember('A',next);r.clear('A',key);assert.equal(r.get('A'),next);
  r.clear('A',next);assert.equal(r.requestKey('A',null,()=>next),next);
  const blocked=createSlotRecovery(()=>{throw Error('storage denied')});blocked.remember('A',key);assert.equal(blocked.get('A'),key);blocked.clear('A',key);assert.equal(blocked.get('A'),null);
});
