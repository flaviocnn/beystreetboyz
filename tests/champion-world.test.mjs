import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {ownsThrone,canExportThrone} from '../app/lib/reigning-champion.ts';
registerHooks({resolve(specifier,context,next){
  try{return next(specifier,context);}catch(error){
    if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){
      const url=new URL(specifier+'.ts',context.parentURL);if(existsSync(url))return{url:url.href,shortCircuit:true};
    }throw error;
  }
}});
const {PLACES,FURNITURE,START,canWalk,nearbyPlace,guildCamera}=await import('../app/gilda/mappa/guild-world.ts');

test('guild layout reflects the priority tiers, leaves corridors clear and frames both primary objects',()=>{
  assert.deepEqual(PLACES.slice(0,4).map(p=>p.id),['ranking','throne','mirror','archive']);
  assert.equal(nearbyPlace(START.x,START.y),null,'Arrival is an open hall, not a competing interaction prompt');
  for(const place of PLACES)assert.equal(canWalk(place.x,place.y),true,place.id+' interaction stays outside its furniture');
  const objects=Object.entries(FURNITURE);
  for(let i=0;i<objects.length;i++)for(let j=i+1;j<objects.length;j++){
    const [an,a]=objects[i],[bn,b]=objects[j];
    const separate=a.x+a.w+64<=b.x||b.x+b.w+64<=a.x||a.y+a.h+64<=b.y||b.y+b.h+64<=a.y;
    assert.ok(separate,an+' and '+bn+' need at least 64 world pixels of clearance');
  }
  for(const [width,height]of [[760,520],[360,540],[760,240],[1400,700]]){
    const camera=guildCamera(width,height,START);
    for(const key of ['ranking','throne']){
      const object=FURNITURE[key];
      assert.ok(object.x>=camera.x&&object.x+object.w<=camera.x+width/camera.scale,key+' should be visible on arrival');
      assert.ok(object.y>=camera.y&&object.y+object.h<=camera.y+height/camera.scale,key+' should fit vertically');
    }
  }
});

test('the throne is separate from the annual statue and every guild interaction stays reachable',()=>{
  assert.equal(PLACES.filter(p=>p.id==='throne').length,1);
  const throne=PLACES.find(p=>p.id==='throne');
  assert.equal(nearbyPlace(throne.x,throne.y),'throne');
  const reached=new Set(),seen=new Set([`${START.x},${START.y}`]),queue=[START];
  for(let i=0;i<queue.length&&reached.size<PLACES.length;i++){
    const {x,y}=queue[i];const place=nearbyPlace(x,y);if(place)reached.add(place);
    for(const [dx,dy] of [[8,0],[-8,0],[0,8],[0,-8]]){
      const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
      if(!seen.has(key)&&canWalk(nx,ny)){seen.add(key);queue.push({x:nx,y:ny});}
    }
  }
  assert.deepEqual([...reached].sort(),PLACES.map(p=>p.id).sort());
});
test('a throne photo expires when its winning member or stage changes, including consecutive wins',()=>{
  const active={champion:{memberId:'a',stage:{slug:'first'}},canUseThrone:true};
  assert.equal(canExportThrone(active,'a','first'),true);
  assert.equal(canExportThrone(active,'a','older'),false);
  assert.equal(canExportThrone(active,'b','first'),false);
  assert.equal(canExportThrone({...active,canUseThrone:false},'a','first'),false);
  assert.equal(canExportThrone(null,'a','first'),false);
  assert.equal(canExportThrone({champion:null,canUseThrone:false},'a','first'),false);
});
test('throne eligibility uses the linked winner ID, never a name or unlinked winner',()=>{
  assert.equal(ownsThrone(null,'a'),false);
  assert.equal(ownsThrone({memberId:null,displayName:'a'},'a'),false);
  assert.equal(ownsThrone({memberId:'a',displayName:'Other name'},'a'),true);
  assert.equal(ownsThrone({memberId:'b',displayName:'a'},'a'),false);
});
