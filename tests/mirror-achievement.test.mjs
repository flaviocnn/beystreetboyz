import test from 'node:test';
import assert from 'node:assert/strict';
import {achievementCaption,topEightStages,wrapPortraitText} from '../app/lib/mirror-achievement.ts';
import { MIRROR_MOTTOS, mirrorMotto } from '../app/lib/mirror-mottos.ts';
const measure=(text,size)=>Array.from(text).length*size*.61;
const part=value=>({value,custom:false});
const bey={blades:[part('Delta'),part('Unicorn'),part('Heavy')],ratchet:part('9-60'),bit:part('Free Ball')};
test('mirror offers only numeric top-eight placements, not arbitrary eligible flags',()=>{
  const stages=[{name:'Win',finalRank:1},{name:'Eighth',finalRank:8},{finalRank:9,eligible:true},{finalRank:null,eligible:true}];
  assert.deepEqual(topEightStages(stages).map(s=>s.name),['Win','Eighth']);
  assert.equal(achievementCaption(null,measure),null);
  assert.equal(achievementCaption(stages[2],measure),null);
});
test('photo includes stage name, placement and every beyblade component when present',()=>{
  const noDeck=achievementCaption({name:'Tappa #2 Ranked BSB',finalRank:8,deck:null},measure);
  assert.match(noDeck.lines.map(l=>l.text).join(' '),/8° POSTO · TOP 8.*Tappa #2 Ranked BSB/);
  assert.ok(!noDeck.lines.some(l=>l.text.includes('DECK')));
  const caption=achievementCaption({name:'Tappa #2 Ranked BSB',finalRank:1,deck:[bey,bey,bey]},measure);
  const text=caption.lines.map(l=>l.text).join(' ');
  assert.match(text,/1° POSTO · VINCITORE/);
  for(const n of [1,2,3])assert.ok(text.includes(`BEY ${n}: Delta + Unicorn + Heavy / 9-60 / Free Ball`));
  assert.ok(caption.height>noDeck.height);
  for(const line of caption.lines)assert.ok(measure(line.text,line.size)<=284);
});
test('long custom names wrap without clipping or dropping any characters',()=>{
  const name='ComponenteSenzaSpazi'.repeat(5);
  const wrapped=wrapPortraitText(name,text=>measure(text,12),284);
  assert.equal(wrapped.join(''),name);
  const longBey={...bey,blades:Array.from({length:5},()=>part(name))};
  const caption=achievementCaption({name:'Tappa molto lunga '.repeat(8),finalRank:5,deck:[longBey,longBey,longBey]},measure);
  assert.ok(caption.lines.every(l=>measure(l.text,l.size)<=284));
  assert.ok(caption.height>caption.lines.at(-1).y);
});
test('mirror offers the five new phrases, original motto and a genuinely hidden choice',()=>{
  const requested=['La fenice brucia sempre','Io non mi innamorerò . Però mi sta piacendo','Se ci fosse','Non volevo esagerare','Dai cazzo ma come si fa'];
  for(const text of requested)assert.ok(MIRROR_MOTTOS.some(motto=>motto.text===text));
  assert.equal(mirrorMotto('guild-seal'),'IL MIO SIGILLO. LA MIA GILDA.');
  assert.equal(mirrorMotto(''),'');assert.equal(mirrorMotto('future-locked-motto'),'');
  assert.equal(new Set(MIRROR_MOTTOS.map(motto=>motto.id)).size,MIRROR_MOTTOS.length);
  for(const motto of MIRROR_MOTTOS){const lines=wrapPortraitText(motto.text,value=>value.length*6,295);assert.equal(lines.join(' '),motto.text);assert.ok(lines.every(line=>line.length*6<=295));}
});
