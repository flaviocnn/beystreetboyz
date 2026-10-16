import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
const {dealBlackjack,blackjackMove,handValue,cardFace}=await import('../app/lib/blackjack.ts');
const deck=(...first)=>[...first,...Array.from({length:52},(_,i)=>i).filter(c=>!first.includes(c))];
test('aces, faces, naturals and pushes follow fixed 2 BC stakes and 3:2 blackjack payouts',()=>{
  assert.deepEqual(handValue([0,13,8]),{total:21,soft:true});
  assert.deepEqual(handValue([0,13,8,22]),{total:21,soft:false});
  assert.equal(handValue([10,11]).total,20);assert.equal(cardFace(12).rank,'K');assert.equal(cardFace(13).red,true);
  let hand=dealBlackjack(deck(0,8,12,7));assert.equal(hand.status,'blackjack');assert.equal(hand.payout,5);
  hand=dealBlackjack(deck(0,13,12,25));assert.equal(hand.status,'push');assert.equal(hand.payout,2);
  hand=dealBlackjack(deck(8,13,7,25));assert.equal(hand.status,'lost');assert.equal(hand.payout,0);
  assert.throws(()=>dealBlackjack(Array(52).fill(0)));assert.throws(()=>blackjackMove(hand,'hit'));
});
test('hit, automatic stand at 21, bust, dealer draws and soft-17 stand do not mutate the saved hand',()=>{
  let hand=dealBlackjack(deck(9,0,7,5,2)); // player 18 vs dealer A+6 (soft17)
  const old=structuredClone(hand);let next=blackjackMove(hand,'stand');
  assert.deepEqual(hand,old);assert.equal(next.dealer.length,2);assert.equal(next.status,'won');assert.equal(next.payout,4);
  hand=dealBlackjack(deck(9,8,7,5,12));next=blackjackMove(hand,'hit');assert.equal(next.status,'lost');assert.equal(next.payout,0);assert.equal(next.player.length,3);
  hand=dealBlackjack(deck(4,9,5,7,8));next=blackjackMove(hand,'hit');assert.equal(next.player.length,3);assert.equal(next.status,'playing');
  hand=dealBlackjack(deck(9,8,4,5,18,2));next=blackjackMove(hand,'hit');assert.equal(next.playerTotal,undefined);assert.equal(handValue(next.player).total,21);assert.notEqual(next.status,'playing');
  hand=dealBlackjack(deck(9,8,7,6,1));next=blackjackMove(hand,'stand');assert.equal(next.dealer.length,3);assert.equal(next.status,'push');
});
test('every shuffled shoe has unique cards, a bounded end and correct payouts across both strategies',()=>{
  for(let seed=0;seed<300;seed++){
    const cards=Array.from({length:52},(_,i)=>i);let rng=seed+1;
    for(let i=51;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=rng%(i+1);[cards[i],cards[j]]=[cards[j],cards[i]]}
    for(const threshold of [12,17]){
      let hand=dealBlackjack(cards),moves=0;
      while(hand.status==='playing'&&moves++<30)hand=blackjackMove(hand,handValue(hand.player).total<threshold?'hit':'stand');
      assert.notEqual(hand.status,'playing');assert.ok(hand.cursor<=52);
      assert.equal(new Set([...hand.player,...hand.dealer]).size,hand.player.length+hand.dealer.length);
      assert.equal(hand.payout,{won:4,lost:0,push:2,blackjack:5}[hand.status]);
    }
  }
});
test('blackjack recovery keeps the entire action, scopes members and ignores forged action data',async()=>{
  const {parseBlackjackAction,createBlackjackRecovery}=await import('../app/lib/blackjack-recovery.ts');
  const requestKey='7ed557b5-30dc-4779-8c05-a97a607b4f91',handId='7ed557b5-30dc-4779-8c05-a97a607b4f92';
  const action={requestKey,action:'hit',handId,version:2};assert.deepEqual(parseBlackjackAction(action),action);
  for(const forged of [{...action,payout:100},{...action,version:-1},{...action,action:'double'},{requestKey,action:'start',handId},null])assert.equal(parseBlackjackAction(forged),null);
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const r=createBlackjackRecovery(()=>storage);r.remember('A',action);assert.equal(r.get('B'),null);
  assert.deepEqual(createBlackjackRecovery(()=>storage).get('A'),action);
  r.clear('A',handId);assert.deepEqual(r.get('A'),action);r.clear('A',requestKey);assert.equal(r.get('A'),null);
  const blocked=createBlackjackRecovery(()=>{throw Error('blocked')});blocked.remember('A',action);assert.deepEqual(blocked.get('A'),action);
});
test('the guild shelf contains only the two playable games',async()=>{
  const {GAMES}=await import('../app/gilda/mappa/guild-world.ts');
  assert.deepEqual(GAMES.map(game=>game.id),['slot','blackjack']);
  assert.ok(GAMES.every(game=>game.color&&game.symbol&&game.kind));
});
