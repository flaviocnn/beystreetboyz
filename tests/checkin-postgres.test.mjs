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
    const base='http://localhost:3000';
    const cookie=(await sessionCookie('staff','staff',new Request(base))).split(';')[0];
    let providerFailure=false;
    let roster=[{id:'11',type:'participant',attributes:{name:'Member display',username:'member_fixture',states:{active:true}}},{id:'12',type:'participant',attributes:{name:'Guest',username:null,states:{active:false}}}];
    globalThis.fetch=async(url,init)=>{
      const parsed=new URL(url);assert.equal(parsed.hostname,'api.challonge.com');assert.equal(init.headers.Authorization,'test-only-api-key');assert.equal(parsed.searchParams.has('api_key'),false);
      if(providerFailure)return Response.json({errors:['failure']},{status:503});
      if(parsed.pathname.endsWith('/participants.json'))return Response.json({data:roster,links:{next:null},meta:{count:roster.length}});
      return Response.json({data:{id:'42',type:'tournament',attributes:{name:'Fixture tournament'}}});
    };
    const request=(method,path,body,auth=cookie,origin=base)=>new Request(base+path,{method,headers:{...(auth?{cookie:auth}:{}),origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const ctx=(id,participantId)=>({params:Promise.resolve({id,participantId})});
    const json=async response=>({status:response.status,data:await response.json()});
    assert.equal((await routes.GET(request('GET','/api/staff/checkin',null,null))).status,401);
    assert.equal((await routes.POST(request('POST','/api/staff/checkin',{},cookie,'https://evil.example'))).status,403);
    const memberId=randomUUID();
    await db`INSERT INTO members(id,first_name,challonge_username,password_salt,password_hash,created_at,payment_paid,payment_method,membership_status) VALUES(${memberId},'Fixture','member_fixture','salt','hash','2026-10-15',true,'bank','registered')`;
    const input={name:'Check-in fixture',eventDate:'2026-10-21',feeCents:500,tournament:'fixture_event'};
    assert.equal((await routes.POST(request('POST','/api/staff/checkin',{...input,feeCents:-1}))).status,400);
    let response=await json(await routes.POST(request('POST','/api/staff/checkin',input)));
    assert.equal(response.status,200);let detail=response.data;const eventId=detail.event.id;
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
  }finally{
    globalThis.fetch=originalFetch;
    for(const[k,v]of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
    if(appDb)await appDb.$client.end();if(db)await db.end();
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
  }
});
