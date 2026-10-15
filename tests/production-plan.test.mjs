import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const sourceCode = await readFile(new URL('../app/lib/production-plan.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(sourceCode, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { createProductionPlan, fields } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const member = values => ({ ...Object.fromEntries(fields.members.map(k => [k, null])), id: 'old-id', first_name: 'Historic name', challonge_username: 'granburstone', password_salt: 'salt', password_hash: 'hash', auth_version: 0, must_change_password: 1, payment_paid: 0, score: 0, avatar_style: 0, avatar_color: 0, ...values });
const snapshot = members => ({ members, guild_messages: [], tournament_stages: [], tournament_results: [], challonge_identities: [] });
test('merge retains the live OAuth id, session version and avatar while restoring historical credentials', () => {
  const plan = createProductionPlan(snapshot([member({})]), snapshot([member({ id: 'live-id', challonge_id: '123', challonge_username: 'GranBurstone', auth_version: 4, avatar_style: 2, avatar_color: 7, password_hash: 'oauth-random' })]));
  assert.equal(plan.members[0].id, 'live-id');
  assert.equal(plan.members[0].challonge_id, '123');
  assert.equal(plan.members[0].auth_version, 4);
  assert.equal(plan.members[0].avatar_color, 7);
  assert.equal(plan.members[0].password_hash, 'hash');
  assert.equal(plan.members[0].must_change_password, true);
  assert.equal(plan.idMap['old-id'], 'live-id');
});
test('mismatched identities and unknown historical points cannot be imported', () => {
  assert.throws(() => createProductionPlan(snapshot([member({ fiscal_code: 'ONE' })]), snapshot([member({ fiscal_code: 'OTHER' })])), /identity_conflict/);
  assert.throws(() => createProductionPlan(snapshot([member({ score: 100 })]), snapshot([])), /historical_score_mismatch/);
});
test('messages and tournament results follow the merged member without duplicate accounts', () => {
  const data = snapshot([member({ score: 15 })]);
  data.guild_messages = [{ id: 'msg', member_id: 'old-id', day: '2026-10-15', body: 'fixture', created_at: '2026-10-15T12:00:00Z' }];
  data.tournament_stages = [{ slug: 'stage', name: 'Fixture', event_date: '2026-10-15', source_url: 'https://challonge.com/fixture', attendance: 24, coefficient_milli: 1000, synced_at: 1700000000 }];
  data.tournament_results = [{ stage_slug: 'stage', source_key: 'nika37', display_name: '__Grizzly__', challonge_username: '__Grizzly__', source_challonge_username: 'nika37', member_id: 'old-id', group_name: 'A', swiss_wins: 2, swiss_losses: 3, final_rank: null, base_points: 15, stage_points: 15 }];
  const plan = createProductionPlan(data, snapshot([member({ id: 'live-id' })]));
  assert.equal(plan.guild_messages[0].member_id, 'live-id');
  assert.equal(plan.tournament_results[0].member_id, 'live-id');
  assert.equal(plan.tournament_results[0].source_key, 'nika37');
  assert.match(plan.tournament_stages[0].synced_at, /^2023-/);
});
