import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { clearSessionCookie, getSession, sameOrigin, sessionCookie } from "../../../lib/auth";
import { localDevelopmentRequest } from "../../../lib/local-development";

const response = (body: unknown, status = 200, cookie?: string) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) },
});
function guard(request: Request, mutation = false) {
  if (!localDevelopmentRequest(request)) return response({ error: "Non trovato" }, 404);
  // No unauthenticated local mutation from another website or a form POST.
  if (mutation && (!request.headers.get("origin") || !sameOrigin(request)
    || request.headers.get("sec-fetch-site") === "cross-site"
    || !request.headers.get("content-type")?.startsWith("application/json"))) return response({ error: "Richiesta non valida" }, 403);
  return null;
}
export async function GET(request: Request) {
  const denied = guard(request); if (denied) return denied;
  try {
    const people = await getDb().select({ id: members.id, firstName: members.firstName, lastName: members.lastName,
      challongeUsername: members.challongeUsername, role: members.role }).from(members).orderBy(asc(members.challongeUsername), asc(members.firstName));
    const session = await getSession(request);
    return response({ members: people, impersonatingId: session?.method === "local" ? session.id : null });
  } catch { return response({ error: "Database locale non disponibile. Avvia PostgreSQL Docker." }, 503); }
}
export async function POST(request: Request) {
  const denied = guard(request, true); if (denied) return denied;
  const text = await request.text();
  if (text.length > 1000) return response({ error: "Richiesta troppo grande" }, 413);
  let body; try { body = JSON.parse(text); } catch { return response({ error: "Dati non validi" }, 400); }
  if (typeof body?.memberId !== "string" || !body.memberId || body.memberId.length > 100) return response({ error: "Scegli un membro" }, 400);
  try {
    const [member] = await getDb().select({ id: members.id, authVersion: members.authVersion }).from(members).where(eq(members.id, body.memberId));
    if (!member) return response({ error: "Membro non trovato nel database locale" }, 404);
    return response({ ok: true }, 200, await sessionCookie("member", member.id, request, member.authVersion, "local"));
  } catch { return response({ error: "Impossibile accedere al database locale" }, 503); }
}
export async function DELETE(request: Request) {
  const denied = guard(request, true); if (denied) return denied;
  return response({ ok: true }, 200, clearSessionCookie(request));
}
