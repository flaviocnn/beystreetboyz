import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const oauth = await load("../app/lib/challonge-oauth.ts");
const auth = await load("../app/lib/auth.ts");
test("provider identity comes only from a valid /me response", () => {
  assert.deepEqual(oauth.parseChallongeProfile({ data: { id: "123", attributes: { username: "__Grizzly__", email: "untrusted@example.com" } } }), { id: "123", username: "__Grizzly__" });
  for (const value of [null, {}, { data: { id: "abc", attributes: { username: "foo" } } }, { data: { id: "123", attributes: { username: "" } } }]) assert.throws(() => oauth.parseChallongeProfile(value));
});
test("OAuth state must match the browser cookie and expected format", () => {
  const state = "a".repeat(64);
  const req = (query, cookie) => new Request(`https://example.com/api/auth/challonge/callback?state=${query}`, { headers: cookie ? { cookie } : {} });
  assert.equal(oauth.validState(req(state, `other=1;tq_challonge_state=${state}`)), state);
  assert.equal(oauth.validState(req(state)), null);
  assert.equal(oauth.validState(req(state, `tq_challonge_state=${"b".repeat(64)}`)), null);
  assert.equal(oauth.validState(req("short", "tq_challonge_state=short")), null);
});
test("OAuth session method is signed and old password sessions remain valid", async () => {
  process.env.SESSION_SECRET = "unit-test-only-secret";
  const request = new Request("https://example.com");
  const cookie = await auth.sessionCookie("member", "member-id", request, 3, "challonge");
  const sessionRequest = value => new Request(request, { headers: { cookie: value.split(";")[0] } });
  assert.equal((await auth.getSession(sessionRequest(cookie))).method, "challonge");
  assert.equal(await auth.getSession(sessionRequest(cookie.replace(".challonge.", ".password."))), null);
  const payload = `member.member-id.${Date.now() + 60000}.2`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("hex");
  assert.equal((await auth.getSession(sessionRequest(`tq_session=${payload}.${sig}`))).method, "password");
});

test("only a configured, exact HTTPS callback or local development callback is accepted", () => {
  const keys = ["CHALLONGE_CLIENT_ID", "CHALLONGE_CLIENT_SECRET", "CHALLONGE_REDIRECT_URI"];
  const previous = keys.map(k => process.env[k]);
  try {
    process.env.CHALLONGE_CLIENT_ID = "test-client";
    process.env.CHALLONGE_CLIENT_SECRET = "test-secret";
    for (const uri of ["http://external.example/api/auth/challonge/callback", "https://example.com/other", "https://example.com/api/auth/challonge/callback?next=evil", "https://user:pass@example.com/api/auth/challonge/callback"]) {
      process.env.CHALLONGE_REDIRECT_URI = uri;
      assert.throws(oauth.challongeConfig);
    }
    process.env.CHALLONGE_REDIRECT_URI = "https://example.com/api/auth/challonge/callback";
    assert.equal(oauth.challongeConfig().origin, "https://example.com");
    delete process.env.CHALLONGE_CLIENT_SECRET;
    assert.throws(oauth.challongeConfig, /not_configured/);
  } finally { keys.forEach((k, i) => { if (previous[i] === undefined) delete process.env[k]; else process.env[k] = previous[i]; }); }
});
