import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const local = url => ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);

test('PostgreSQL: staff, password, avatar and daily message limit', async () => {
  assert.ok(local(base) && local(process.env.DATABASE_URL), 'Integration tests are local only');
  assert.ok(process.env.STAFF_PASSPHRASE);
  const crossOrigin = await fetch(`${base}/api/staff/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' },
    body: JSON.stringify({ passphrase: process.env.STAFF_PASSPHRASE }),
  });
  assert.equal(crossOrigin.status, 403);
  async function call(path, method = 'GET', body, cookie) {
    const response = await fetch(`${base}/api/${path}`, {
      method, headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  assert.equal((await call('staff/members')).status, 401);
  const staff = await call('staff/session', 'POST', { passphrase: process.env.STAFF_PASSPHRASE });
  assert.equal(staff.status, 200);
  const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
  const input = { firstName: 'Integration', lastName: 'Fixture', fiscalCode: `TEST${suffix}`, documentNumber: 'TEST-ONLY', email: null };
  let id;
  try {
    const created = await call('staff/members', 'POST', input, staff.cookie);
    assert.equal(created.status, 201);
    id = created.data.member.id;
    assert.equal(created.data.member.email, null);
    assert.equal((await call('staff/members', 'POST', input, staff.cookie)).status, 409);
    const login = await call('member/session', 'POST', { identifier: input.fiscalCode.toLowerCase(), password: created.data.password });
    assert.equal(login.status, 200);
    assert.equal(login.data.member.mustChangePassword, true);
    assert.equal((await call('member/avatar', 'PUT', { avatarStyle: 23, avatarColor: 7 }, login.cookie)).status, 403);
    const changed = await call('member/password', 'POST', { currentPassword: created.data.password, password: `New-${suffix}` }, login.cookie);
    assert.equal(changed.status, 200);
    assert.equal(changed.data.member.mustChangePassword, false);
    assert.equal((await call('member/session', 'GET', undefined, login.cookie)).data.member, null);
    const avatar = await call('member/avatar', 'PUT', { avatarStyle: 23, avatarColor: 7 }, changed.cookie);
    assert.equal(avatar.status, 200);
    assert.equal(avatar.data.member.avatarStyle, 23);
    const posts = await Promise.all([1, 2].map(n => call('guild/messages', 'POST', { body: `Integration fixture ${n}` }, changed.cookie)));
    assert.deepEqual(posts.map(p => p.status).sort(), [201, 409]);
    assert.equal((await call('guild/messages', 'GET', undefined, changed.cookie)).data.postedToday, true);
    const email = `fixture-${suffix}@example.invalid`;
    assert.equal((await call(`staff/members/${id}`, 'PUT', { ...input, email }, staff.cookie)).status, 200);
    assert.equal((await call('member/session', 'POST', { identifier: email, password: `New-${suffix}` })).status, 200);
    assert.equal((await call(`staff/members/${id}/reset-password`, 'POST', {}, staff.cookie)).status, 200);
    assert.equal((await call('member/session', 'GET', undefined, changed.cookie)).data.member, null);
  } finally {
    if (id) assert.equal((await call(`staff/members/${id}`, 'DELETE', undefined, staff.cookie)).status, 200);
  }
});
