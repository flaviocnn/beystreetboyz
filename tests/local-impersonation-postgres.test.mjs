import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import postgres from 'postgres';
registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
  try{return next(specifier,context);}catch(error){
    if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))for(const suffix of ['.ts','/index.ts']){
      const url=new URL(specifier+suffix,context.parentURL);if(existsSync(url))return{url:url.href,shortCircuit:true};
    }throw error;
  }
}});

test('local impersonation uses real member permissions and writes only into an isolated local database',async()=>{
  const localUrl=new URL(process.env.DATABASE_URL);
  assert.ok(['127.0.0.1','localhost'].includes(localUrl.hostname),'Local database required');
  const name='tq_local_test_'+randomBytes(8).toString('hex');
  const admin=postgres(localUrl.toString(),{max:1,prepare:false});
  const keys=['DATABASE_URL','NODE_ENV','VERCEL'];const prior=keys.map(k=>process.env[k]);
  let db,appDb;
  try{
    await admin.unsafe(`CREATE DATABASE "${name}"`);localUrl.pathname='/'+name;
    db=postgres(localUrl.toString(),{max:1,prepare:false});
    const dir=new URL('../supabase/migrations/',import.meta.url);
    for(const file of(await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.unsafe(await readFile(new URL(file,dir),'utf8'));
    process.env.DATABASE_URL=localUrl.toString();process.env.NODE_ENV='development';delete process.env.VERCEL;
    const {getDb}=await import('../db/index.ts');appDb=getDb();
    const route=await import('../app/api/dev/impersonate/route.ts');
    const memberRoute=await import('../app/api/member/session/route.ts');
    const {staffSession}=await import('../app/lib/staff-access.ts');
    const avatar=await import('../app/api/member/avatar/route.ts');
    const regular=randomUUID(),staff=randomUUID();
    await db`INSERT INTO members(id,first_name,challonge_username,role,must_change_password,password_salt,password_hash,created_at) VALUES(${regular},'Regular fixture','regular_fixture','member',true,'salt','hash','2026-10-16'),(${staff},'Staff fixture','staff_fixture','staff',true,'salt','hash','2026-10-16')`;
    const req=(method='GET',body,cookie,origin='http://localhost:3000',url='http://localhost:3000/api/dev/impersonate')=>new Request(url,{method,headers:{...(origin?{origin}:{}),'content-type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const json=async response=>({status:response.status,data:await response.json()});
    const listed=await json(await route.GET(req()));assert.equal(listed.status,200);assert.equal(listed.data.members.length,2);
    assert.equal(Object.hasOwn(listed.data.members[0],'passwordHash'),false);
    assert.equal((await route.POST(req('POST',{memberId:regular},null,'https://evil.example'))).status,403);
    assert.equal((await route.POST(req('POST',{memberId:regular},null,null))).status,403);
    assert.equal((await route.POST(req('POST',{memberId:'missing'}))).status,404);
    let response=await route.POST(req('POST',{memberId:regular}));assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie').split(';')[0];
    let member=(await json(await memberRoute.GET(req('GET',null,cookie)))).data.member;
    assert.equal(member.id,regular);assert.equal(member.mustChangePassword,false);
    assert.equal(await staffSession(req('GET',null,cookie)),null,'Ordinary member is not upgraded');
    assert.equal((await avatar.PUT(req('PUT',{avatarStyle:1,avatarColor:3},cookie))).status,200);
    const stored=(await db`SELECT avatar_style,avatar_color,must_change_password,password_hash FROM members WHERE id=${regular}`)[0];
    assert.deepEqual({...stored},{avatar_style:1,avatar_color:3,must_change_password:true,password_hash:'hash'});
    assert.equal((await json(await route.GET(req('GET',null,cookie)))).data.impersonatingId,regular);
    response=await route.POST(req('POST',{memberId:staff}));
    const staffCookie=response.headers.get('set-cookie').split(';')[0];
    assert.equal((await staffSession(req('GET',null,staffCookie))).role,'staff');
    await db`UPDATE members SET role='member' WHERE id=${staff}`;
    assert.equal(await staffSession(req('GET',null,staffCookie)),null);
    await db`UPDATE members SET auth_version=1 WHERE id=${regular}`;
    assert.equal((await json(await memberRoute.GET(req('GET',null,cookie)))).data.member,null);
    const logout=await route.DELETE(req('DELETE',{},staffCookie));assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
    process.env.NODE_ENV='production';
    for(const method of ['GET','POST','DELETE'])assert.equal((await route[method](req(method,method==='POST'?{memberId:staff}:null))).status,404);
    assert.equal((await json(await memberRoute.GET(req('GET',null,staffCookie)))).data.member,null,'Local cookie cannot become a production session');
    process.env.NODE_ENV='development';process.env.VERCEL='1';
    assert.equal((await route.GET(req())).status,404);
    delete process.env.VERCEL;
    assert.equal((await route.GET(req('GET',null,null,null,'https://beystreetboyz.vercel.app/api/dev/impersonate'))).status,404);
    process.env.DATABASE_URL='postgresql://fixture:fixture@remote.supabase.co/postgres';
    assert.equal((await route.GET(req())).status,404);
    assert.throws(getDb,/Sicurezza locale/,'Even a cached connection cannot bypass the remote-database guard');
  }finally{
    keys.forEach((key,i)=>{if(prior[i]===undefined)delete process.env[key];else process.env[key]=prior[i];});
    if(appDb)await appDb.$client.end();if(db)await db.end();
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);await admin.end();
  }
});
