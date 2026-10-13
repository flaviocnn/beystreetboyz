import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { members } from "../../../../../db/schema";
import { getSession, sameOrigin } from "../../../../lib/auth";
import { apiError, parseMemberInput } from "../../../../lib/members";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  if ((await getSession(request))?.role !== "staff") return apiError("Accesso riservato allo staff", 401);
  const input = parseMemberInput(await request.json().catch(() => null));
  if (!input) return apiError("Controlla tutti i campi e l'indirizzo email", 400);
  try {
    const [member] = await getDb().update(members).set(input).where(eq(members.id, (await context.params).id)).returning({ id: members.id, firstName: members.firstName, lastName: members.lastName, fiscalCode: members.fiscalCode, documentNumber: members.documentNumber, email: members.email, score: members.score, createdAt: members.createdAt });
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
