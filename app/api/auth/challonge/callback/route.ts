import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { oauthAttempts } from "../../../../../db/schema";
import { sessionCookie } from "../../../../lib/auth";
import { challongeConfig, fetchChallongeProfile, stateCookie, stateHash, validState } from "../../../../lib/challonge-oauth";
import { resolveChallongeMember } from "../../../../lib/challonge-member";
import { isUniqueViolation } from "../../../../lib/database-errors";

export async function GET(request: Request) {
  const headers = new Headers({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  headers.append("Set-Cookie", stateCookie("", new URL(request.url).protocol === "https:"));
  try {
    const config = challongeConfig();
    const state = validState(request);
    if (!state) throw new Error("expired");
    const [attempt] = await getDb().delete(oauthAttempts).where(and(eq(oauthAttempts.stateHash, await stateHash(state)), gt(oauthAttempts.expiresAt, new Date()))).returning();
    if (!attempt) throw new Error("expired");
    const params = new URL(request.url).searchParams;
    if (params.has("error")) throw new Error("cancelled");
    const code = params.get("code");
    if (!code || code.length > 4096) throw new Error("expired");
    const member = await resolveChallongeMember(await fetchChallongeProfile(code));
    headers.append("Set-Cookie", await sessionCookie("member", member.id, new Request(config.redirectUri), member.authVersion, "challonge"));
    headers.set("Location", new URL("/gilda/mappa", config.origin).toString());
  } catch (error) {
    const allowed = ["expired", "cancelled", "account_conflict", "not_configured"];
    const reason = error instanceof Error && allowed.includes(error.message) ? error.message : isUniqueViolation(error) ? "account_conflict" : "unavailable";
    headers.set("Location", `/gilda?challonge_error=${reason}`);
  }
  return new Response(null, { status: 303, headers });
}
