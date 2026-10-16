import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile,readdir } from 'node:fs/promises';
import { randomBytes,randomUUID } from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  try{return next(specifier,context);}catch(error){
    if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.ts','/index.ts']){
      const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return{url:url.href,shortCircuit:true};
    }throw error;
  }
}});

test('check-in routes: authorization, roster sync, financial records, concurrency, audit and rollback',async()=>{
  const localUrl=new URL(process.env.DATABASE_URL);
  assert.ok(['127.0.0.1','localhost'].includes(localUrl.hostname),'Local database required');
  const name='tq_checkin_test_'+randomBytes(8).toString('hex');
  const admin=postgres(localUrl.toString(),{max:1,prepare:false});
  const originalFetch=globalThis.fetch;
  const oldEnv={DATABASE_URL:process.env.DATABASE_URL,CHALLONGE_API_KEY:process.env.CHALLONGE_API_KEY};
  let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);localUrl.pathname='/'+name;
    db=postgres(localUrl.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=localUrl.toString();process.env.CHALLONGE_API_KEY='test-only-api-key';
    const {getDb}=await import('../db/index.ts');appDb=getDb();
    const {sessionCookie}=await import('../app/lib/auth.ts');
    const routes=await import('../app/api/staff/checkin/route.ts');
    const {GET:detailRoute}=await import('../app/api/staff/checkin/[id]/route.ts');
    const {POST:syncRoute}=await import('../app/api/staff/checkin/[id]/sync/route.ts');
    const {PATCH:updateRoute}=await import('../app/api/staff/checkin/[id]/participants/[participantId]/route.ts');
    const {GET:challongeRoute}=await import('../app/api/staff/checkin/challonge/route.ts');
    const base='http://localhost:3000';
    const cookie=(await sessionCookie('staff','staff',new Request(base))).split(';')[0];
    let providerFailure=false;
    let roster=[{id:'11',type:'participant',attributes:{name:'Member display',username:'member_fixture',states:{active:true}}},{id:'12',type:'participant',attributes:{name:'Guest',username:null,states:{active:false}}}];
    globalThis.fetch=async(url,init)=>{
      const parsed=new URL(url);assert.equal(parsed.hostname,'api.challonge.com');assert.equal(init.headers.Authorization,'test-only-api-key');assert.equal(parsed.searchParams.has('api_key'),false);
      assert.equal(parsed.searchParams.get('include_community_tournaments'),'1','Community scope must survive lookup, participant pagination and numeric-ID resync');
      if(providerFailure)return Response.json({errors:['failure']},{status:503});
      if(parsed.pathname.endsWith('/tournaments.json'))return Response.json({data:[{id:'42',type:'tournament',attributes:{name:'Fixture tournament',state:'pending',starts_at:'2026-10-20T23:30:00Z'},relationships:{community:{data:{id:'197576'}}}}],links:{next:null}});
      if(parsed.pathname.endsWith('/participants.json'))return Response.json({data:roster,links:{next:null},meta:{count:roster.length}});
      return Response.json({data:{id:'42',type:'tournament',attributes:{name:'Fixture tournament',starts_at:'2026-10-20T23:30:00Z'}}});
    };
    const request=(method,path,body,auth=cookie,origin=base)=>new Request(base+path,{method,headers:{...(auth?{cookie:auth}:{}),origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const ctx=(id,participantId)=>({params:Promise.resolve({id,participantId})});
    const json=async response=>({status:response.status,data:await response.json()});
    assert.equal((await routes.GET(request('GET','/api/staff/checkin',null,null))).status,401);
    assert.equal((await challongeRoute(request('GET','/api/staff/checkin/challonge',null,null))).status,401);
    const upcoming=await json(await challongeRoute(request('GET','/api/staff/checkin/challonge')));
    assert.equal(upcoming.status,200);assert.equal(upcoming.data.tournaments[0].name,'Fixture tournament');
    assert.equal(upcoming.data.tournaments[0].eventDate,'2026-10-21');
    assert.equal((await db`SELECT count(*)::int n FROM checkin_events`)[0].n,0,'Listing tournaments must not create check-ins');
    const metadata=await json(await challongeRoute(request('GET','/api/staff/checkin/challonge?tournament=42')));
    assert.equal(metadata.data.tournament.name,'Fixture tournament');
    assert.equal((await routes.POST(request('POST','/api/staff/checkin',{},cookie,'https://evil.example'))).status,403);
    const memberId=randomUUID();
    await db`INSERT INTO members(id,first_name,challonge_username,password_salt,password_hash,created_at,payment_paid,payment_method,membership_status) VALUES(${memberId},'Fixture','member_fixture','salt','hash','2026-10-15',true,'bank','registered')`;
    const input={name:'Check-in fixture',eventDate:'2026-10-21',feeCents:500,tournament:'fixture_event'};
    assert.equal((await routes.POST(request('POST','/api/staff/checkin',{...input,feeCents:-1}))).status,400);
    let response=await json(await routes.POST(request('POST','/api/staff/checkin',input)));
    assert.equal(response.status,200);let detail=response.data;const eventId=detail.event.id;
    assert.equal(detail.event.name,'Fixture tournament','The provider name is authoritative, not a client-supplied name');
    assert.equal(detail.participants.length,2);assert.equal(detail.summary.pending,2);assert.equal(detail.summary.registered,2,'Eliminated/inactive is not the same as unregistered');
    const member=detail.participants.find(r=>r.participantId==='11');const guest=detail.participants.find(r=>r.participantId==='12');
    assert.equal(member.memberId,memberId);assert.equal(guest.memberId,null);assert.equal((await db`SELECT count(*)::integer n FROM members`)[0].n,1);
    const patch=async(row,body)=>json(await updateRoute(request('PATCH','/api/staff/checkin/'+eventId+'/participants/'+row.id,{version:row.version,operator:'Desk A',...body}),ctx(eventId,row.id)));
    response=await patch(member,{action:'pay',paymentMethod:'cash'});assert.equal(response.status,200);detail=response.data;
    assert.equal(detail.summary.collectedCents,500);assert.equal(detail.summary.paidPresent,1);
    assert.equal((await patch(member,{action:'pay',paymentMethod:'cash'})).status,409);
    const parallel=await Promise.all([patch(guest,{action:'pay',paymentMethod:'card'}),patch(guest,{action:'pay',paymentMethod:'cash'})]);
    assert.deepEqual(parallel.map(r=>r.status).sort(),[200,409]);detail=parallel.find(r=>r.status===200).data;
    assert.equal(detail.summary.collectedCents,1000);assert.equal(detail.summary.ready,true);assert.equal(detail.audit.length,2);
    const paidGuest=detail.participants.find(r=>r.id===guest.id);
    response=await patch(paidGuest,{action:'correct',presence:'absent',paymentStatus:'unpaid',note:'Wrong player selected'});assert.equal(response.status,200);detail=response.data;
    assert.equal(detail.summary.collectedCents,500);assert.equal(detail.summary.ready,true);assert.equal(detail.audit.length,3);
    roster=[roster[1],{id:'13',type:'participant',attributes:{name:'New guest',username:null,states:{active:true}}}];
    response=await json(await syncRoute(request('POST','/api/staff/checkin/'+eventId+'/sync'),ctx(eventId)));
    assert.equal(response.status,200);detail=response.data;
    const removed=detail.participants.find(r=>r.id===member.id);
    assert.equal(removed.registered,false);assert.equal(removed.paymentStatus,'paid');assert.equal(removed.paidCents,500);
    assert.equal(detail.summary.removedPresent,1);assert.equal(detail.summary.ready,false);assert.equal(detail.audit.length,3);
    assert.equal((await patch(removed,{action:'pay',paymentMethod:'cash'})).status,400);
    const before=JSON.stringify(detail);providerFailure=true;
    assert.equal((await syncRoute(request('POST','/api/staff/checkin/'+eventId+'/sync'),ctx(eventId))).status,502);
    const reread=await json(await detailRoute(request('GET','/api/staff/checkin/'+eventId),ctx(eventId)));
    assert.equal(JSON.stringify(reread.data),before);
    const annual=(await db`SELECT payment_paid,payment_method,membership_status FROM members WHERE id=${memberId}`)[0];
    assert.deepEqual({...annual},{payment_paid:true,payment_method:'bank',membership_status:'registered'});
    const audit=(await db`SELECT before_state,after_state,operator_label FROM checkin_audit WHERE action='correct'`)[0];
    assert.equal(audit.before_state.paymentStatus,'paid');assert.equal(audit.after_state.paymentStatus,'unpaid');assert.equal(audit.operator_label,'Desk A');

    // Personal staff authorization never upgrades/replaces the Guild cookie.
    const staffSessionRoute=await import('../app/api/staff/session/route.ts');
    const memberRoutes=await import('../app/api/staff/members/route.ts');
    const memberDetail=await import('../app/api/staff/members/[id]/route.ts');
    const resetRoute=await import('../app/api/staff/members/[id]/reset-password/route.ts');
    const {currentMember}=await import('../app/lib/member-access.ts');
    const personalCookie=async(version=0,method='password')=>(await sessionCookie('member',memberId,new Request(base),version,method)).split(';')[0];
    const personal=await personalCookie();
    const personalRequest=(method,path,body,auth=personal)=>request(method,path,body,auth);
    assert.equal((await staffSessionRoute.GET(personalRequest('GET','/api/staff/session'))).headers.has('set-cookie'),false);
    assert.equal((await json(await staffSessionRoute.GET(personalRequest('GET','/api/staff/session')))).data.authenticated,false);
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members'))).status,401);
    assert.equal((await routes.GET(personalRequest('GET','/api/staff/checkin'))).status,401);
    await db`UPDATE members SET role='staff' WHERE id=${memberId}`;
    assert.equal((await json(await staffSessionRoute.GET(personalRequest('GET','/api/staff/session')))).data.authenticated,true);
    assert.equal((await currentMember(personalRequest('GET','/api/member/session'))).id,memberId);
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members'))).status,200);
    assert.equal((await routes.GET(personalRequest('GET','/api/staff/checkin'))).status,200);
    providerFailure=false;
    assert.equal((await syncRoute(personalRequest('POST','/api/staff/checkin/'+eventId+'/sync'),ctx(eventId))).status,200);
    // Role injection in create/update is ignored, even for an authorized caller.
    const created=await json(await memberRoutes.POST(personalRequest('POST','/api/staff/members',{firstName:'Second fixture',role:'staff'})));
    assert.equal(created.status,201);assert.equal(created.data.member.role,'member');
    const target=created.data.member.id;
    assert.equal((await memberDetail.PUT(personalRequest('PUT','/api/staff/members/'+target,{firstName:'Edited fixture',role:'staff'}),ctx(target))).status,200);
    assert.equal((await db`SELECT role FROM members WHERE id=${target}`)[0].role,'member');
    assert.equal((await resetRoute.POST(personalRequest('POST','/api/staff/members/'+target+'/reset-password',{}),ctx(target))).status,200);
    assert.equal((await memberDetail.DELETE(personalRequest('DELETE','/api/staff/members/'+target),ctx(target))).status,200);
    await db`UPDATE members SET must_change_password=true WHERE id=${memberId}`;
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members'))).status,401);
    const oauth=await personalCookie(0,'challonge');
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members',null,oauth))).status,200);
    await db`UPDATE members SET auth_version=1 WHERE id=${memberId}`;
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members',null,oauth))).status,401);
    const fresh=await personalCookie(1,'challonge');
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members',null,fresh))).status,200);
    await db`UPDATE members SET role='member' WHERE id=${memberId}`;
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members',null,fresh))).status,401);
    await db`UPDATE members SET role='staff' WHERE id=${memberId}`;
    await db`DELETE FROM members WHERE id=${memberId}`;
    assert.equal((await memberRoutes.GET(personalRequest('GET','/api/staff/members',null,fresh))).status,401);
  }finally{
    globalThis.fetch=originalFetch;
    for(const[k,v]of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
    if(appDb)await appDb.$client.end();if(db)await db.end();
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
  }
});
