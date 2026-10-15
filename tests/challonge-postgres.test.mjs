import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Run the actual TypeScript route handlers against a local database only.
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  try { return next(specifier, context); }
  catch (error) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      for (const suffix of [".ts", "/index.ts"]) {
        const url = new URL(specifier + suffix, context.parentURL);
        if (existsSync(url)) return { url: url.href, shortCircuit: true };
      }
    }
    throw error;
  }
} });

test("Challonge OAuth: binding, provisioning, conflicts, callback replay and session", async () => {
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database required");
  const { getDb } = await import("../db/index.ts");
  const { members, challongeIdentities, oauthAttempts } = await import("../db/schema.ts");
  const { resolveChallongeMember } = await import("../app/lib/challonge-member.ts");
  const { eq, inArray } = await import("drizzle-orm");
  const { GET: start } = await import("../app/api/auth/challonge/route.ts");
  const { GET: callback } = await import("../app/api/auth/challonge/callback/route.ts");
  const { currentMember } = await import("../app/lib/member-access.ts");
  const { stateHash } = await import("../app/lib/challonge-oauth.ts");
  const db = getDb();
  const suffix = randomUUID().replaceAll("-", "");
  const username = `OAuth_${suffix}`;
  const profile = { id: `9${BigInt('0x' + suffix).toString().slice(0, 25)}`, username };
  const createdIds = [];
  const states = [];
  const originalFetch = globalThis.fetch;
  const originalEnv = Object.fromEntries(["CHALLONGE_CLIENT_ID", "CHALLONGE_CLIENT_SECRET", "CHALLONGE_REDIRECT_URI"].map(k => [k, process.env[k]]));
  try {
    const [existing] = await db.insert(members).values({ id: randomUUID(), firstName: "OAuth fixture", challongeUsername: username.toUpperCase(), mustChangePassword: true, passwordSalt: "fixture", passwordHash: "fixture", createdAt: new Date().toISOString() }).returning();
    createdIds.push(existing.id);
    const bound = await resolveChallongeMember(profile);
    assert.equal(bound.id, existing.id);
    assert.equal(bound.mustChangePassword, true, "Local password reset remains required");
    assert.equal((await resolveChallongeMember({ ...profile, username: username + "_renamed" })).id, existing.id);
    await assert.rejects(resolveChallongeMember({ id: profile.id + "1", username: username + "_renamed" }), /account_conflict/);

    const newProfile = { id: profile.id + "2", username: username + "_new" };
    const [a, b] = await Promise.all([resolveChallongeMember(newProfile), resolveChallongeMember(newProfile)]);
    createdIds.push(a.id, b.id);
    assert.equal(a.id, b.id, "Concurrent login must not duplicate members");
    assert.equal(a.membershipStatus, "unknown");
    assert.equal(a.paymentPaid, null);
    assert.equal(a.email, null);
    const [identity] = await db.select().from(challongeIdentities).where(eq(challongeIdentities.challongeId, profile.id));
    assert.equal(identity.memberId, existing.id);

    process.env.CHALLONGE_CLIENT_ID = "fixture-client";
    process.env.CHALLONGE_CLIENT_SECRET = "fixture-secret";
    process.env.CHALLONGE_REDIRECT_URI = "http://localhost:3000/api/auth/challonge/callback";
    const entry = await start(new Request("http://localhost:3000/api/auth/challonge"));
    assert.equal(entry.status, 303);
    const authorize = new URL(entry.headers.get("location"));
    assert.equal(authorize.origin, "https://api.challonge.com");
    assert.equal(authorize.searchParams.get("scope"), "me");
    assert.equal(authorize.searchParams.has("client_secret"), false);
    const state = authorize.searchParams.get("state");
    states.push(await stateHash(state));
    const cookie = entry.headers.get("set-cookie").split(";")[0];
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      calls++;
      if (url.endsWith("/oauth/token")) {
        assert.equal(init.body.get("redirect_uri"), process.env.CHALLONGE_REDIRECT_URI);
        return Response.json({ access_token: "fixture-token" });
      }
      assert.equal(init.headers.Authorization, "Bearer fixture-token");
      return Response.json({ data: { id: profile.id, attributes: { username: username + "_renamed" } } });
    };
    const url = `http://localhost:3000/api/auth/challonge/callback?code=fixture&state=${state}`;
    const missingCookie = await callback(new Request(url));
    assert.match(missingCookie.headers.get("location"), /expired/);
    assert.equal(calls, 0);
    const response = await callback(new Request(url, { headers: { cookie } }));
    assert.equal(response.headers.get("location"), "http://localhost:3000/gilda/mappa");
    const sessionCookie = response.headers.getSetCookie().find(c => c.startsWith("tq_session="));
    const member = await currentMember(new Request("http://localhost:3000", { headers: { cookie: sessionCookie.split(";")[0] } }));
    assert.equal(member.id, existing.id);
    assert.equal(member.mustChangePassword, false, "OAuth session is not blocked by local password reset");
    const replay = await callback(new Request(url, { headers: { cookie } }));
    assert.match(replay.headers.get("location"), /expired/);
    assert.equal(calls, 2, "Replay must not exchange the code twice");

    const expiredState = "c".repeat(64);
    states.push(await stateHash(expiredState));
    await db.insert(oauthAttempts).values({ stateHash: states.at(-1), expiresAt: new Date(Date.now() - 1000) });
    const expired = await callback(new Request(`http://localhost:3000/api/auth/challonge/callback?code=fixture&state=${expiredState}`, { headers: { cookie: `tq_challonge_state=${expiredState}` } }));
    assert.match(expired.headers.get("location"), /expired/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (createdIds.length) await db.delete(members).where(inArray(members.id, createdIds));
    if (states.length) await db.delete(oauthAttempts).where(inArray(oauthAttempts.stateHash, states));
    await db.$client.end();
  }
});
