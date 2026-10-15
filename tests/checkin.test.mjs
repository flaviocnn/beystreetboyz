import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../app/lib/checkin.ts',import.meta.url),'utf8');
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseFee,validEventDate,tournamentReference,checkinSummary,paymentTransition} = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const row = {id:'one',eventId:'event',participantId:'1',displayName:'Fixture',challongeUsername:null,memberId:null,registered:true,presence:'pending',paymentStatus:'unpaid',paidCents:null,paymentMethod:null,paidAt:null,paidBy:null,version:0};
test('euro inputs use integer cents, validate dates and restrict tournament links',()=>{
  assert.equal(parseFee('5,20'),520);assert.equal(parseFee('0'),0);
  for(const fee of ['-1','5.123','1e2','Infinity','','10000.01'])assert.equal(parseFee(fee),null);
  assert.equal(validEventDate('2026-02-30'),false);assert.equal(validEventDate('2026-10-21'),true);
  assert.deepEqual(tournamentReference('https://challonge.com/it/psmc5x5/standings'),{ref:'psmc5x5',community:null,url:'https://challonge.com/psmc5x5'});
  assert.equal(tournamentReference('https://community.challonge.com/tappa_2').community,'community');
  for(const url of ['https://evil.example/tappa','https://challonge.com.evil.example/x','https://api.challonge.com/v2.1/x','http://challonge.com/x','https://user:secret@challonge.com/x','https://challonge.com/x/../../z/a'])assert.throws(()=>tournamentReference(url));
});
test('readiness considers actual presence, unpaid attendees and removed registrations',()=>{
  const paid={...row,presence:'present',paymentStatus:'paid',paidCents:500};
  assert.equal(checkinSummary([paid,{...row,presence:'absent'}]).ready,true);
  assert.equal(checkinSummary([paid,row]).ready,false);
  assert.equal(checkinSummary([{...paid,paymentStatus:'unpaid'}]).ready,false);
  assert.equal(checkinSummary([{...paid,registered:false}]).ready,false);
  assert.equal(checkinSummary([{...row,presence:'absent'}]).ready,false);
  assert.equal(checkinSummary([{...paid,registered:false,presence:'absent'}]).collectedCents,500,'Removed/absent does not imply a refund');
});
test('payment is complete, versioned, idempotent, and corrections require a reason',()=>{
  const now=new Date('2026-10-15T15:00:00Z');
  const first=paymentTransition(row,{action:'pay',version:0,operator:'Desk A',paymentMethod:'cash'},500,now);
  assert.equal(first.values.paidCents,500);assert.equal(first.values.presence,'present');assert.equal(first.values.paidBy,'Desk A');
  const paid={...row,...first.values};
  assert.equal(paymentTransition(paid,{action:'pay',version:1,operator:'Desk B',paymentMethod:'cash'},500).unchanged,true);
  assert.throws(()=>paymentTransition(paid,{action:'pay',version:0,operator:'Desk B',paymentMethod:'cash'},500),/stale/);
  assert.throws(()=>paymentTransition(paid,{action:'correct',version:1,operator:'Desk B',presence:'absent',paymentStatus:'paid',paymentMethod:'cash'},500));
  const absent=paymentTransition(paid,{action:'correct',version:1,operator:'Desk B',presence:'absent',paymentStatus:'paid',paymentMethod:'cash',note:'Assenza confermata'},500);
  assert.equal(absent.values.paidAt.toISOString(),now.toISOString());assert.equal(absent.values.paidBy,'Desk A');
  const cancel=paymentTransition(paid,{action:'correct',version:1,operator:'Desk B',presence:'pending',paymentStatus:'unpaid',note:'Registrato per errore'},500);
  assert.equal(cancel.values.paidAt,null);assert.equal(cancel.values.paidCents,null);
  assert.throws(()=>paymentTransition({...row,registered:false},{action:'pay',version:0,operator:'Desk A',paymentMethod:'cash'},500));
});
