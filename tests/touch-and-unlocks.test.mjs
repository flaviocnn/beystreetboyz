import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
registerHooks({resolve(s,c,next){try{return next(s,c)}catch(e){if(s.startsWith('.')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
const {joystickDirections,joystickKnob,createJoystick}=await import('../app/lib/joystick.ts');
const {isDemonicStyle,unlockedAvatarStyle}=await import('../app/lib/avatar-unlocks.ts');
const {evaluateAchievements}=await import('../app/lib/achievements.ts');
test('joystick supports eight directions, dead zone and bounded thumb movement',()=>{
  for(const [x,y,expected]of [[0,-40,['up']],[0,40,['down']],[-40,0,['left']],[40,0,['right']],[-40,-40,['left','up']],[40,40,['right','down']],[-40,40,['left','down']],[40,-40,['right','up']]])assert.deepEqual(joystickDirections(x,y),expected);
  for(const [x,y]of[[0,0],[5,5],[10,0],[NaN,3]])assert.deepEqual(joystickDirections(x,y),[]);
  for(let i=0;i<360;i++){const p=joystickKnob(1000*Math.cos(i),1000*Math.sin(i));assert.ok(Math.hypot(p.x,p.y)<=32.000001);}
});
test('holding a direction does not repeat starts, and cancellation releases every direction exactly once',()=>{
  const events=[],stick=createJoystick((d,a)=>events.push([d,a]));
  stick.move(40,0);stick.move(90,0);assert.deepEqual(events,[['right',true]]);
  stick.move(-30,-30);assert.deepEqual(events.slice(1),[['right',false],['left',true],['up',true]]);
  stick.stop();stick.stop();assert.deepEqual(events.slice(-2),[['left',false],['up',false]]);
  stick.move(40,0);stick.move(0,0);assert.deepEqual(events.slice(-2),[['right',true],['right',false]]);
});
test('both demonic variants require a manual award, independent of username, tournament wins or other achievements',()=>{
  assert.equal(isDemonicStyle(11),true);assert.equal(isDemonicStyle(23),true);assert.equal(isDemonicStyle(10),false);
  assert.equal(unlockedAvatarStyle(11,false),0);assert.equal(unlockedAvatarStyle(23,false),12);assert.equal(unlockedAvatarStyle(23,true),23);
  const facts={loggedIn:true,avatarChanged:true,hasMessage:true,stages:[]};
  assert.equal(evaluateAchievements(facts).find(a=>a.id==='demon-slayer').qualified,false);
  assert.equal(evaluateAchievements({...facts,manualAchievements:['demon-slayer']}).find(a=>a.id==='demon-slayer').qualified,true);
});
test('menu and map legend use solid readable backgrounds and valid CSS colors',async()=>{
  const css=await readFile(new URL('../app/components/world-game.css',import.meta.url),'utf8');
  for(const match of css.matchAll(/#([0-9a-f]+)\b/gi))assert.ok([3,4,6,8].includes(match[1].length),match[0]);
  for(const selector of ['.world-menu nav','.world-guide section']){
    const rule=css.slice(css.indexOf(selector));assert.match(rule.slice(0,rule.indexOf('}')),/color:#25352b; background:#f2f3ea;/);
  }
});
