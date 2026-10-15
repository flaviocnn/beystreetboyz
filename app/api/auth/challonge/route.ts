import { lt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { oauthAttempts } from "../../../../db/schema";
import { challongeConfig, stateCookie, stateHash } from "../../../lib/challonge-oauth";

export async function GET(request: Request) {
  try {
    const config = challongeConfig();
    // Always use the registered origin, never a forwarded Host for OAuth redirects.
    const canonical = new URL("/api/auth/challonge", config.origin);
    if ((request.headers.get("host") || new URL(request.url).host) !== canonical.host) return Response.redirect(canonical, 303);
    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
    await getDb().delete(oauthAttempts).where(lt(oauthAttempts.expiresAt, new Date()));
    await getDb().insert(oauthAttempts).values({ stateHash: await stateHash(state), expiresAt: new Date(Date.now() + 600000) });
    const url = new URL("https://api.challonge.com/oauth/authorize");
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code", scope: "me", state }).toString();
    return new Response(null, { status: 303, headers: { Location: url.toString(), "Set-Cookie": stateCookie(state, config.origin.startsWith("https:")), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    const reason = error instanceof Error && error.message === "not_configured" ? "not_configured" : "unavailable";
    return new Response(null, { status: 303, headers: { Location: `/gilda?challonge_error=${reason}`, "Cache-Control": "no-store" } });
  }
}
