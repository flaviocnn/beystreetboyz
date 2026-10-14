import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { members } from "../../../../../../db/schema";
import { getSession, hashPassword, newMemberPassword, sameOrigin } from "../../../../../lib/auth";
import { apiError } from "../../../../../lib/members";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  if ((await getSession(request))?.role !== "staff") return apiError("Accesso riservato allo staff", 401);

  const id = (await context.params).id;
  const password = newMemberPassword();
  const passwordSalt = crypto.randomUUID();
  const [member] = await getDb().update(members).set({
    passwordSalt,
    passwordHash: await hashPassword(password, passwordSalt),
    mustChangePassword: true,
    authVersion: sql`${members.authVersion} + 1`,
  }).where(eq(members.id, id)).returning({
    id: members.id, firstName: members.firstName, lastName: members.lastName,
    email: members.email, fiscalCode: members.fiscalCode,
  });
  if (!member) return apiError("Membro non trovato", 404);
  return Response.json({ member, password }, { headers: { "Cache-Control": "no-store" } });
}
