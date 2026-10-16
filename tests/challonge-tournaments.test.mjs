import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')){const u=new URL(s+'.ts',c.parentURL);if(existsSync(u))return{url:u.href,shortCircuit:true}}throw e}}});
const {fetchUpcomingTournaments,fetchTournament,fetchRoster}=await import('../app/lib/challonge-roster.ts');
const {BSB_COMMUNITY,challongeEventDate}=await import('../app/lib/challonge-tournament.ts');
const record=(id,state='pending',community=BSB_COMMUNITY.id,startsAt='2026-10-20T23:30:00Z')=>({id,type:'tournament',attributes:{name:'Tappa '+id,state,starts_at:startsAt,full_challonge_url:'https://challonge.com/it/test_'+id},relationships:{community:{data:{id:community}}}});

test('Challonge dates use Europe/Rome including midnight, daylight saving, absent and invalid dates',()=>{
  assert.equal(challongeEventDate('2026-10-20T23:30:00Z'),'2026-10-21');
  assert.equal(challongeEventDate('2026-12-20T23:30:00Z'),'2026-12-21');
  assert.equal(challongeEventDate('2026-10-21T20:30:00+02:00'),'2026-10-21');
  assert.equal(challongeEventDate('2026-10-21'),'2026-10-21');
  for(const value of [null,'','not a date','2026-02-30'])assert.equal(challongeEventDate(value),null);
});
test('upcoming list is community-scoped, paginated and excludes other communities and started/completed events',async()=>{
  const original=globalThis.fetch,oldKey=process.env.CHALLONGE_API_KEY;process.env.CHALLONGE_API_KEY='fixture';let calls=0;
  try{
    globalThis.fetch=async(url,init)=>{
      const u=new URL(url);calls++;assert.equal(u.searchParams.get('community_id'),BSB_COMMUNITY.identifier);assert.equal(u.searchParams.get('include_community_tournaments'),'1');assert.equal(init.headers.Authorization,'fixture');assert.equal(u.searchParams.has('api_key'),false);
      return Response.json(u.searchParams.get('page')==='1'?{data:[record('1'),record('2','complete'),record('3','underway'),record('4','pending','other')],links:{next:'page2'}}:{data:[record('5','checked_in',BSB_COMMUNITY.id,null),record('6','checking_in'),record('7','accepting_predictions')],links:{next:null}});
    };
    const list=await fetchUpcomingTournaments();assert.equal(calls,2);assert.deepEqual(list.map(t=>t.id),['1','6','7','5']);assert.equal(list[0].eventDate,'2026-10-21');assert.equal(list.at(-1).eventDate,null);
  }finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.CHALLONGE_API_KEY;else process.env.CHALLONGE_API_KEY=oldKey;}
});
test('metadata and participant resync resolve community tournaments created by another organizer',async()=>{
  const original=globalThis.fetch,oldKey=process.env.CHALLONGE_API_KEY;process.env.CHALLONGE_API_KEY='fixture';
  try{
    globalThis.fetch=async url=>{
      const u=new URL(url);
      if(!u.searchParams.get('community_id'))return Response.json({errors:[]},{status:404});
      assert.equal(u.searchParams.get('community_id'),BSB_COMMUNITY.identifier);
      if(u.pathname.endsWith('/participants.json'))return Response.json({data:[],links:{next:null}});
      return Response.json({data:record('42')});
    };
    const meta=await fetchTournament('42');assert.equal(meta.name,'Tappa 42');assert.equal(meta.sourceUrl,'https://challonge.com/test_42');assert.equal(meta.community,BSB_COMMUNITY.identifier);
    const roster=await fetchRoster('42');assert.equal(roster.id,'42');assert.deepEqual(roster.participants,[]);
    globalThis.fetch=async()=>Response.json({errors:[]},{status:429});await assert.rejects(fetchUpcomingTournaments(true),/Limite richieste/);
  }finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.CHALLONGE_API_KEY;else process.env.CHALLONGE_API_KEY=oldKey;}
});
test('upcoming cache coalesces bursts, separates API credentials and never caches a failed refresh',async()=>{
  const original=globalThis.fetch,oldKey=process.env.CHALLONGE_API_KEY;let calls=0;
  try{
    process.env.CHALLONGE_API_KEY='cache-fixture-A';
    globalThis.fetch=async()=>{calls++;return Response.json({data:[record('77')],links:{next:null}})};
    await Promise.all([fetchUpcomingTournaments(),fetchUpcomingTournaments(),fetchUpcomingTournaments()]);
    await fetchUpcomingTournaments();assert.equal(calls,1);
    process.env.CHALLONGE_API_KEY='cache-fixture-B';await fetchUpcomingTournaments();assert.equal(calls,2);
    globalThis.fetch=async()=>{calls++;return Response.json({errors:[]},{status:429})};
    await assert.rejects(fetchUpcomingTournaments(true),/Limite richieste/);
    globalThis.fetch=async()=>{calls++;return Response.json({data:[],links:{next:null}})};
    assert.deepEqual(await fetchUpcomingTournaments(),[]);assert.equal(calls,4);
  }finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.CHALLONGE_API_KEY;else process.env.CHALLONGE_API_KEY=oldKey;}
});
