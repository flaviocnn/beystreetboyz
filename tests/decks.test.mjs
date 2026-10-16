import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeck,isTopEight,catalog,INTEGRATED_RATCHET} from '../app/lib/decks.ts';
import {bladeOptions} from '../app/lib/blade-options.ts';

test('blade picker sorts globally A-Z and filters names, categories and systems without mutating the catalog',()=>{
  const original=structuredClone(catalog.blades);
  const sorted=bladeOptions(catalog.blades);
  assert.equal(sorted.length,155);
  for(let i=1;i<sorted.length;i++)assert.ok(sorted[i-1].value.localeCompare(sorted[i].value,'it',{sensitivity:'base',numeric:true})<=0);
  assert.ok(bladeOptions(catalog.blades,'  wIzArD  ').every(part=>part.value.toLowerCase().includes('wizard')));
  assert.ok(bladeOptions(catalog.blades,'wizard').length>0);
  assert.ok(bladeOptions(catalog.blades,'Metal Blade').every(part=>part.category==='Metal Blade'));
  assert.ok(bladeOptions(catalog.blades,'CX').length>0);
  assert.deepEqual(bladeOptions(catalog.blades,'not-existing-xyz'),[]);
  assert.equal(bladeOptions([{value:'Fénice',category:'Lama',system:'CX'}],'fenice')[0].value,'Fénice');
  assert.deepEqual(catalog.blades,original);
});

const part=value=>({value,custom:false});
const bey=()=>({blades:[part('Wizard Rod')],ratchet:part('9-60'),bit:part('Ball')});
test('catalog preserves all three source lists without importing pool quantities or tier rules',()=>{
  assert.equal(catalog.bits.length,52);assert.equal(catalog.ratchets.length,37);assert.equal(catalog.blades.length,155);
  for(const list of [catalog.bits.map(p=>p.value),catalog.ratchets,catalog.blades.map(p=>p.value)])assert.equal(new Set(list).size,list.length);
  assert.ok(catalog.blades.some(p=>p.value==='Delta'&&p.category==='Metal Blade'));
});
test('deck requires exactly three complete beyblades and explicit custom component values',()=>{
  const deck=[bey(),bey(),bey()];assert.deepEqual(parseDeck(deck),deck);
  assert.equal(parseDeck(deck.slice(0,2)),null);assert.equal(parseDeck([...deck,bey()]),null);
  deck[0].bit=part('Missing bit');assert.equal(parseDeck(deck),null);
  deck[0].bit={value:' New bit ',custom:true};assert.equal(parseDeck(deck)[0].bit.value,'New bit');
  deck[0].bit={value:'   ',custom:true};assert.equal(parseDeck(deck),null);
  for(const value of ['<script>','hello\nworld','x'.repeat(101)]){deck[0].bit={value,custom:true};assert.equal(parseDeck(deck),null);}
  deck[0].bit={value:'Ball',custom:true};assert.equal(parseDeck(deck)[0].bit.custom,false);
  deck[0].ratchet=part(INTEGRATED_RATCHET);assert.ok(parseDeck(deck));
  deck[0].blades=[part('Delta'),part('Unicorn'),part('Heavy')];assert.ok(parseDeck(deck));
  deck[0].blades=[];assert.equal(parseDeck(deck),null);
  deck[0].blades=Array.from({length:6},()=>part('Delta'));assert.equal(parseDeck(deck),null);
});
test('top eight uses the imported numeric placement, not points or an unchecked truthy value',()=>{
  for(const rank of [1,5,8])assert.equal(isTopEight(rank),true);
  for(const rank of [null,undefined,0,-1,9,1.5,'1',NaN])assert.equal(isTopEight(rank),false);
});
