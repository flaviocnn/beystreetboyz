import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { hashPassword, sameOrigin, sessionCookie, verifyPassword } from "../../../lib/auth";
import { currentMember, memberView } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const member = await currentMember(request);
  if (!member) return apiError("Accedi prima di modificare la password", 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof body?.currentPassword !== "string" || typeof body?.password !== "string" || body.password.length < 10 || body.password.length > 128 || body.currentPassword.length > 200) return apiError("La nuova password deve avere da 10 a 128 caratteri", 400);
  if (!(await verifyPassword(body.currentPassword, member.passwordSalt, member.passwordHash))) return apiError("La password attuale non è corretta", 400);
  if (body.currentPassword === body.password) return apiError("Scegli una password diversa da quella temporanea", 400);
  const passwordSalt = crypto.randomUUID();
  const [updated] = await getDb().update(members).set({ passwordSalt, passwordHash: await hashPassword(body.password, passwordSalt), mustChangePassword: false, authVersion: sql`${members.authVersion} + 1` }).where(and(eq(members.id, member.id), eq(members.authVersion, member.authVersion))).returning();
  if (!updated) return apiError("Accedi nuovamente e riprova", 409);
  return Response.json({ member: memberView(updated) }, { headers: { "Set-Cookie": await sessionCookie("member", updated.id, request, updated.authVersion), "Cache-Control": "no-store" } });
}
