import { checkStaffPhrase, clearSessionCookie, getSession, sameOrigin, sessionCookie } from "../../../lib/auth";
import { apiError } from "../../../lib/members";

export async function GET(request: Request) {
  const session = await getSession(request);
  return Response.json({ authenticated: session?.role === "staff" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const body = await request.json().catch(() => null) as { passphrase?: unknown } | null;
  if (typeof body?.passphrase !== "string" || !(await checkStaffPhrase(body.passphrase))) return apiError("Parola d'ordine errata", 401);
  return Response.json({ authenticated: true }, { headers: { "Set-Cookie": await sessionCookie("staff", "staff", request), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  return Response.json({ authenticated: false }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
