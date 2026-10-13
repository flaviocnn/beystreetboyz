import { asc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { getSession, hashPassword, newMemberPassword, sameOrigin } from "../../../lib/auth";
import { apiError, parseMemberInput } from "../../../lib/members";

async function authorize(request: Request) {
  return (await getSession(request))?.role === "staff";
}

export async function GET(request: Request) {
  if (!(await authorize(request))) return apiError("Accesso riservato allo staff", 401);
  const rows = await getDb().select({ id: members.id, firstName: members.firstName, lastName: members.lastName, fiscalCode: members.fiscalCode, documentNumber: members.documentNumber, email: members.email, score: members.score, createdAt: members.createdAt }).from(members).orderBy(asc(members.lastName), asc(members.firstName));
  return Response.json({ members: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  if (!(await authorize(request))) return apiError("Accesso riservato allo staff", 401);
  const input = parseMemberInput(await request.json().catch(() => null));
  if (!input) return apiError("Controlla tutti i campi e l'indirizzo email", 400);
  const password = newMemberPassword();
  const passwordSalt = crypto.randomUUID();
  try {
    const [member] = await getDb().insert(members).values({ id: crypto.randomUUID(), ...input, passwordSalt, passwordHash: await hashPassword(password, passwordSalt), createdAt: new Date().toISOString() }).returning({ id: members.id, firstName: members.firstName, lastName: members.lastName, fiscalCode: members.fiscalCode, documentNumber: members.documentNumber, email: members.email, score: members.score, createdAt: members.createdAt });
    return Response.json({ member, password }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (String(error).includes("UNIQUE")) return apiError("Questa email appartiene già a un membro", 409);
    throw error;
  }
}
