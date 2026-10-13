import { and, eq, ne, sql } from "drizzle-orm";
import { staffMemberFields } from "../../../../lib/member-access";
import { getDb } from "../../../../../db";
import { members } from "../../../../../db/schema";
import { getSession, sameOrigin, hashPassword } from "../../../../lib/auth";
import { apiError, parseMemberInput } from "../../../../lib/members";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  if ((await getSession(request))?.role !== "staff") return apiError("Accesso riservato allo staff", 401);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = parseMemberInput(body);
  if (!input || !body) return apiError("Controlla i dati, il profilo Challonge e il pagamento", 400);
  const id = (await context.params).id;
  const existing = await getDb().select({ id: members.id }).from(members).where(and(sql`upper(${members.fiscalCode}) = ${input.fiscalCode}`, ne(members.id, id))).limit(1);
  if (existing.length) return apiError("Codice fiscale già presente", 409);
  const reset: { passwordSalt?: string; passwordHash?: string; mustChangePassword?: boolean; authVersion?: ReturnType<typeof sql> } = {};
  if (body.initialPassword !== undefined) {
    if (typeof body.initialPassword !== "string" || body.initialPassword.length < 10 || body.initialPassword.length > 128) return apiError("Password temporanea non valida", 400);
    reset.passwordSalt = crypto.randomUUID();
    reset.passwordHash = await hashPassword(body.initialPassword, reset.passwordSalt);
    reset.mustChangePassword = true;
    reset.authVersion = sql`${members.authVersion} + 1`;
  }
  try {
    const [member] = await getDb().update(members).set({ ...input, ...reset }).where(eq(members.id, id)).returning(staffMemberFields);
    if (!member) return apiError("Membro non trovato", 404);
    return Response.json({ member });
  } catch (error) {
    if (String(error).includes("UNIQUE")) return apiError("Questa email appartiene già a un membro", 409);
    throw error;
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  if ((await getSession(request))?.role !== "staff") return apiError("Accesso riservato allo staff", 401);
  const [deleted] = await getDb().delete(members).where(eq(members.id, (await context.params).id)).returning({ id: members.id });
  if (!deleted) return apiError("Membro non trovato", 404);
  return Response.json({ deleted: true });
}
