import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { clearSessionCookie, sameOrigin, sessionCookie, verifyPassword } from "../../../lib/auth";
import { apiError } from "../../../lib/members";
import { currentMember, memberView } from "../../../lib/member-access";
export async function GET(request: Request) {
  const member = await currentMember(request);
  return Response.json({ member: member ? memberView(member) : null }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const identifier = body?.identifier ?? body?.email;
  if (typeof identifier !== "string" || typeof body?.password !== "string" || identifier.length > 254 || body.password.length > 200) return apiError("Email o codice fiscale e password richiesti", 400);
  const value = identifier.trim();
  const rows = await getDb().select().from(members).where(value.includes("@") ? eq(members.email, value.toLowerCase()) : sql`upper(${members.fiscalCode}) = ${value.toUpperCase()}`).limit(2);
  const member = rows.length === 1 ? rows[0] : null;
  if (!member || !(await verifyPassword(body.password, member.passwordSalt, member.passwordHash))) return apiError("Credenziali non valide", 401);
  return Response.json({ member: memberView(member) }, { headers: { "Set-Cookie": await sessionCookie("member", member.id, request, member.authVersion), "Cache-Control": "no-store" } });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  return Response.json({ member: null }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
