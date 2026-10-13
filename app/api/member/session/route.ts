import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { clearSessionCookie, getSession, sameOrigin, sessionCookie, verifyPassword } from "../../../lib/auth";
import { apiError } from "../../../lib/members";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (session?.role !== "member") return Response.json({ member: null }, { headers: { "Cache-Control": "no-store" } });
  const [member] = await getDb().select({ id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email }).from(members).where(eq(members.id, session.id)).limit(1);
  return Response.json({ member: member ?? null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== "string" || typeof body?.password !== "string") return apiError("Email e password richieste", 400);
  const [member] = await getDb().select().from(members).where(eq(members.email, body.email.trim().toLowerCase())).limit(1);
  if (!member || !(await verifyPassword(body.password, member.passwordSalt, member.passwordHash))) return apiError("Credenziali non valide", 401);
  return Response.json({ member: { id: member.id, firstName: member.firstName, lastName: member.lastName, email: member.email } }, { headers: { "Set-Cookie": await sessionCookie("member", member.id, request), "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  return Response.json({ member: null }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
