import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import assert from 'node:assert/strict';

const origin='https://torino-quest.cannavo-flavio.chatgpt.site';
const secrets=parseEnv(await readFile(new URL('../.dev.vars',import.meta.url),'utf8'));
const payload=JSON.parse(await readFile(new URL('../.local-data/sites-transfer-2026-10-15-ready.json',import.meta.url),'utf8'));
const before=JSON.parse(await readFile(new URL('../.local-data/sites-pre-transfer-2026-10-15.json',import.meta.url),'utf8'));
const login=await fetch(origin+'/api/staff/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({passphrase:secrets.STAFF_PASSPHRASE}),signal:AbortSignal.timeout(60000)});
assert.equal(login.status,200,'Staff login failed');await login.json();
const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie,'Session missing');
const headers={Origin:origin,'Content-Type':'application/json',Cookie:cookie};
try {
  const existingResponse=await fetch(origin+'/api/staff/members',{headers,signal:AbortSignal.timeout(60000)});
  assert.equal(existingResponse.status,200);
  const existing=(await existingResponse.json()).members;
  assert.ok([20,24].includes(existing.length),'Unexpected cloud membership count');
  const alreadyImported=existing.length===24;
  if(!process.argv.includes('--apply')){console.log(JSON.stringify({ready:true,currentMembers:existing.length,newMembers:payload.members.filter(m=>!existing.some(e=>e.id===m.id)).length}));}
  else {
    const result=await fetch(origin+'/api/staff/tournaments/import',{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
    const data=await result.json();
    assert.equal(result.status,200,data.error || 'Import failed');
    assert.equal(data.results,24);assert.equal(data.linkedMembers,23);assert.equal(data.createdMembers,alreadyImported?0:4);
    const finalResponse=await fetch(origin+'/api/staff/members',{headers,signal:AbortSignal.timeout(60000)});
    assert.equal(finalResponse.status,200);
    const members=(await finalResponse.json()).members;
    assert.equal(members.length,24);assert.equal(members.reduce((n,m)=>n+m.score,0),778);
    for(const expected of payload.members){const actual=members.find(m=>m.id===expected.id);assert.ok(actual,'Missing member');assert.equal(actual.challongeUsername?.toLowerCase(),expected.challongeUsername?.toLowerCase());assert.equal(actual.score,expected.score,'Member score mismatch');}
    for(const old of before.members){const actual=members.find(m=>m.id===old.id);for(const key of ['first_name','last_name','fiscal_code','document_number','email','phone','membership_status','payment_method','fee_cents','avatar_style','avatar_color','created_at']){const camel=key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());assert.equal(actual[camel],old[key],`Cloud field changed: ${key}`);}}
    console.log(JSON.stringify({verified:true,members:members.length,newMembers:data.createdMembers,results:data.results,linkedMembers:data.linkedMembers,totalPoints:778,repeatImport:alreadyImported}));
  }
} finally {await fetch(origin+'/api/staff/session',{method:'DELETE',headers});}
