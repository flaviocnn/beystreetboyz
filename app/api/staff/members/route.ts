import { asc, sql } from "drizzle-orm";
import { staffMemberFields } from "../../../lib/member-access";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { getSession, hashPassword, newMemberPassword, sameOrigin } from "../../../lib/auth";
import { apiError, parseMemberInput } from "../../../lib/members";

async function authorize(request: Request) {
  return (await getSession(request))?.role === "staff";
}

export async function GET(request: Request) {
  if (!(await authorize(request))) return apiError("Accesso riservato allo staff", 401);
  const rows = await getDb().select(staffMemberFields).from(members).orderBy(asc(members.lastName), asc(members.firstName));
  return Response.json({ members: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  if (!(await authorize(request))) return apiError("Accesso riservato allo staff", 401);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = parseMemberInput(body);
  if (!input || !body) return apiError("Controlla i dati, il profilo Challonge e il pagamento", 400);
  const existing = await getDb().select({ id: members.id }).from(members).where(sql`upper(${members.fiscalCode}) = ${input.fiscalCode}`).limit(1);
  if (existing.length) return apiError("Codice fiscale già presente", 409);
  if (body.initialPassword !== undefined && (typeof body.initialPassword !== "string" || body.initialPassword.length < 10 || body.initialPassword.length > 128)) return apiError("Password temporanea non valida", 400);
  const password = typeof body.initialPassword === "string" ? body.initialPassword : newMemberPassword();
  const passwordSalt = crypto.randomUUID();
  try {
    const [member] = await getDb().insert(members).values({ id: crypto.randomUUID(), ...input, mustChangePassword: true, passwordSalt, passwordHash: await hashPassword(password, passwordSalt), createdAt: new Date().toISOString() }).returning(staffMemberFields);
    return Response.json({ member, password }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (String(error).includes("UNIQUE")) return apiError("Email o codice fiscale già presenti", 409);
    throw error;
  }
}
