import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const transpile = source => ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(transpile(source)).toString('base64')}`;
const localUrl = dataUrl(await readFile(new URL('../app/lib/local-development.ts',import.meta.url),'utf8'));
const local = await import(localUrl);
const auth = await import(dataUrl((await readFile(new URL('../app/lib/auth.ts',import.meta.url),'utf8')).replace('"./local-development"',JSON.stringify(localUrl))));

test('impersonation is development-only, loopback-only and bound to a local database',async()=>{
  const keys=['NODE_ENV','VERCEL','DATABASE_URL','POSTGRES_URL','SESSION_SECRET'];
  const previous=keys.map(k=>process.env[k]);
  try{
    process.env.NODE_ENV='development';delete process.env.VERCEL;
    process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:55432/local_test';
    process.env.SESSION_SECRET='local-test-secret';
    const request=new Request('http://localhost:3000/api/dev/impersonate');
    assert.equal(local.localDevelopmentRequest(request),true);
    for(const url of ['https://remote.example','http://192.168.1.10:3000','http://localhost.evil.example:3000'])assert.equal(local.localDevelopmentRequest(new Request(url)),false);
    assert.equal(local.localDevelopmentRequest(new Request(request,{headers:{host:'evil.example'}})),false);
    assert.equal(local.isLocalDatabase('postgresql://a:b@remote.supabase.co/db'),false);
    assert.equal(local.isLocalDatabase('postgresql://a:b@localhost/db?host=remote.supabase.co'),false);
    assert.equal(local.isLocalDatabase('not-a-url'),false);
    const cookie=await auth.sessionCookie('member','test-member',request,7,'local');
    assert.match(cookie,/HttpOnly/);
    const withCookie=new Request(request,{headers:{cookie:cookie.split(';')[0]}});
    assert.equal((await auth.getSession(withCookie)).method,'local');
    assert.equal((await auth.getSession(withCookie)).version,7);
    assert.equal(await auth.getSession(new Request('https://beystreetboyz.vercel.app',{headers:{cookie:cookie.split(';')[0]}})),null);
    await assert.rejects(auth.sessionCookie('staff','staff',request,0,'local'));
    process.env.NODE_ENV='production';
    assert.equal(local.localDevelopmentRequest(request),false);
    assert.equal(await auth.getSession(withCookie),null);
    await assert.rejects(auth.sessionCookie('member','test-member',request,7,'local'));
    process.env.NODE_ENV='development';process.env.VERCEL='1';
    assert.equal(local.localDevelopmentRequest(request),false);
    assert.equal(await auth.getSession(withCookie),null);
    delete process.env.VERCEL;process.env.DATABASE_URL='postgresql://a:b@remote.supabase.co/db';
    assert.equal(local.localDevelopmentRequest(request),false);
    assert.equal(await auth.getSession(withCookie),null);
    assert.throws(local.assertDevelopmentDatabaseIsLocal,/Sicurezza locale/);
    process.env.NODE_ENV='production';assert.doesNotThrow(local.assertDevelopmentDatabaseIsLocal);
  }finally{keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});}
});
