import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.ts','/index.ts']){const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return{url:url.href,shortCircuit:true};}throw error;}}});
const {parseWeather,validWeather,weatherKind,solarLight,environmentTargets,WEATHER_INTERVAL,WEATHER_MAX_AGE}=await import('../app/lib/world-weather.ts');
const {createWeatherService,weatherUrl}=await import('../app/lib/weather-service.ts');
const {drawWorldAtmosphere,createAtmospherePaint}=await import('../app/lib/world-atmosphere.ts');
const start=Date.parse('2026-10-16T12:00:00Z');
test('indoor rooms hide weather and the guild HUD does not greet members, unlike the city',()=>{
  const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(read('../app/components/world-weather.tsx'),/if \(indoor\) return null;/);
  for(const path of ['../app/gilda/mappa/page.tsx','../app/banca/bank-room.tsx'])assert.match(read(path),/<WorldWeatherBadge indoor \/>/);
  assert.match(read('../app/gilda/mappa/page.tsx'),/title="Gilda del Grifone"/);
  assert.doesNotMatch(read('../app/gilda/mappa/page.tsx'),/area="GILDA DEL GRIFONE"/);
  assert.doesNotMatch(read('../app/gilda/mappa/page.tsx'),/Bentornato/);
  assert.match(read('../app/page.tsx'),/Bentornato/);
});
const weather=(overrides={})=>({observedAt:start,temperature:20,code:3,cloud:100,precipitation:0,snow:0,wind:3.4,windDirection:198,...overrides});
const payload=(now=start)=>({current:{time:now/1000,temperature_2m:20,weather_code:3,cloud_cover:100,precipitation:0,snowfall:0,wind_speed_10m:3.4,wind_direction_10m:198}});
test('Torino fixed endpoint, numeric observations, weather mapping and unknown-data boundaries',()=>{
  const url=new URL(weatherUrl());assert.equal(url.hostname,'api.open-meteo.com');assert.equal(url.searchParams.get('latitude'),'45.0703');assert.equal(url.searchParams.get('timezone'),'Europe/Rome');assert.equal(url.searchParams.get('timeformat'),'unixtime');
  assert.equal(new URL(weatherUrl('private-key')).hostname,'customer-api.open-meteo.com');
  assert.deepEqual(parseWeather(payload(),start),weather());
  for(const invalid of [null,{}, {current:{...payload().current,temperature_2m:'20'}},{current:{...payload().current,cloud_cover:101}},{current:{...payload().current,weather_code:1234}},{current:{...payload().current,time:(start-WEATHER_MAX_AGE-1)/1000}}])assert.equal(parseWeather(invalid,start),null);
  assert.equal(validWeather(weather({observedAt:start+3600000}),start),false);
  for(const [code,kind] of [[0,'clear'],[1,'partly'],[2,'partly'],[3,'cloud'],[45,'fog'],[48,'fog'],[53,'rain'],[67,'rain'],[82,'rain'],[71,'snow'],[86,'snow'],[95,'storm'],[99,'storm']])assert.equal(weatherKind(weather({code,cloud:0})),kind);
  assert.equal(weatherKind(null),'unknown');
});
test('astronomical light follows Torino season and UTC, with readable interiors and no indoor rain',()=>{
  assert.equal(solarLight(start).phase,'Giorno');assert.equal(solarLight(Date.parse('2026-10-16T00:00:00Z')).phase,'Notte');
  const summer=solarLight(Date.parse('2026-06-21T18:30:00Z')),winter=solarLight(Date.parse('2026-12-21T18:30:00Z'));
  assert.ok(summer.daylight>winter.daylight);assert.ok(summer.altitude>0);assert.equal(winter.daylight,0);
  const before=solarLight(Date.parse('2026-10-25T00:59:00Z')),after=solarLight(Date.parse('2026-10-25T01:01:00Z'));assert.ok(Math.abs(before.altitude-after.altitude)<1,'DST does not jump the sun by an hour');
  const rain=environmentTargets(start,weather({code:65,precipitation:8}));assert.ok(rain.rain>0);assert.ok(rain.darkness<=.5);
  const inside=environmentTargets(start,weather({code:65,precipitation:8}),true);assert.equal(inside.rain,0);assert.equal(inside.snow,0);assert.equal(inside.fog,0);assert.ok(inside.darkness<=.12);
  const stale=environmentTargets(start+WEATHER_MAX_AGE+1,weather({code:65,precipitation:8}));assert.equal(stale.rain,0);
});
test('weather sync deduplicates concurrent requests, caches 15 minutes, backs off and expires stale observations',async()=>{
  let now=start,calls=0,fail=false;
  const service=createWeatherService(async()=>{calls++;if(fail)throw new Error('offline');return Response.json(payload(now));},()=>now);
  const concurrent=await Promise.all([service(),service(),service()]);assert.equal(calls,1);assert.equal(concurrent[0].stale,false);
  now+=WEATHER_INTERVAL-1;await service();assert.equal(calls,1);
  now+=2;fail=true;let data=await service();assert.equal(calls,2);assert.equal(data.stale,true);assert.ok(data.weather);
  await service();assert.equal(calls,2,'failure backoff avoids hammering provider');
  now=start+WEATHER_MAX_AGE+1;data=await service();assert.equal(data.weather,null,'old rain must not persist indefinitely');
  fail=false;now+=60001;data=await service();assert.equal(data.stale,false);assert.equal(data.weather.observedAt,now);
  const never=createWeatherService(()=>{throw new Error('synchronous failure');},()=>now);assert.equal((await never()).weather,null);assert.equal((await never()).stale,true);
});
test('reduced motion leaves precipitation static; transitions do not reset world/player state',()=>{
  const draws=[];const ctx={save(){},restore(){},fillRect(...args){draws.push(args);},set fillStyle(value){}};
  const w=weather({code:75,snow:1});const targets=environmentTargets(start,w);
  const paint={...createAtmospherePaint(),...targets};const state={now:start,weather:w,reducedMotion:true};
  drawWorldAtmosphere(ctx,390,700,1000,state,paint);const first=structuredClone(draws);draws.length=0;
  drawWorldAtmosphere(ctx,390,700,2000,state,paint);assert.deepEqual(draws,first);
  draws.length=0;drawWorldAtmosphere(ctx,390,700,3000,state,createAtmospherePaint(),true);assert.equal(draws.length,2,'interiors only receive light/color washes');
});
