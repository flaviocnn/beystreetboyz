export function challongeConfig() {
  const clientId = process.env.CHALLONGE_CLIENT_ID;
  const clientSecret = process.env.CHALLONGE_CLIENT_SECRET;
  const redirectUri = process.env.CHALLONGE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("not_configured");
  const url = new URL(redirectUri);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) || url.pathname !== "/api/auth/challonge/callback" || url.search || url.hash || url.username || url.password) throw new Error("not_configured");
  return { clientId, clientSecret, redirectUri, origin: url.origin };
}

export async function stateHash(state: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state))), b => b.toString(16).padStart(2, "0")).join("");
}

export function stateCookie(state: string, secure: boolean) {
  return `tq_challonge_state=${state}; Path=/api/auth/challonge; HttpOnly; SameSite=Lax; Max-Age=${state ? 600 : 0}${secure ? "; Secure" : ""}`;
}

export function validState(request: Request) {
  const state = new URL(request.url).searchParams.get("state");
  const cookie = request.headers.get("cookie")?.split(";").map(p => p.trim()).find(p => p.startsWith("tq_challonge_state="))?.slice("tq_challonge_state=".length);
  return state && /^[a-f0-9]{64}$/.test(state) && state === cookie ? state : null;
}

export function parseChallongeProfile(body: unknown) {
  const data = (body as { data?: { id?: unknown; attributes?: { username?: unknown } } } | null)?.data;
  const id = typeof data?.id === "number" && Number.isSafeInteger(data.id) ? String(data.id) : data?.id;
  const username = data?.attributes?.username;
  if (typeof id !== "string" || !/^[0-9]{1,30}$/.test(id) || typeof username !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(username)) throw new Error("invalid_profile");
  return { id, username };
}

export async function fetchChallongeProfile(code: string) {
  const { clientId, clientSecret, redirectUri } = challongeConfig();
  const response = await fetch("https://api.challonge.com/oauth/token", {
    method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }),
  });
  if (!response.ok) throw new Error("provider_error");
  const token = await response.json();
  if (typeof token?.access_token !== "string" || !token.access_token) throw new Error("provider_error");
  const profile = await fetch("https://api.challonge.com/v2.1/me.json", {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token.access_token}`, "Authorization-Type": "v2", Accept: "application/json", "Content-Type": "application/vnd.api+json" },
  });
  if (!profile.ok) throw new Error("provider_error");
  // Tokens and unverified email addresses are deliberately not persisted.
  return parseChallongeProfile(await profile.json());
}
