import { desc, eq, and } from "drizzle-orm";
import { getDb } from "../../../../db";
import { guildMessages, members } from "../../../../db/schema";
import { sameOrigin } from "../../../lib/auth";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { isUniqueViolation } from "../../../lib/database-errors";

function torinoDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function authorizedMember(request: Request) {
  const member = await currentMember(request);
  if (!member) return { error: apiError("Accedi alla Gilda del Grifone", 401) };
  if (member.mustChangePassword) return { error: apiError("Modifica prima la password temporanea", 403) };
  return { member };
}

export async function GET(request: Request) {
  const access = await authorizedMember(request);
  if (access.error) return access.error;
  const member = access.member!;
  const today = torinoDay(new Date());
  const db = getDb();
  const [messages, posted] = await Promise.all([
    db.select({
      id: guildMessages.id, memberId: guildMessages.memberId, day: guildMessages.day,
      body: guildMessages.body, createdAt: guildMessages.createdAt,
      firstName: members.firstName, lastName: members.lastName, challongeUsername: members.challongeUsername,
    }).from(guildMessages).innerJoin(members, eq(guildMessages.memberId, members.id))
      .orderBy(desc(guildMessages.createdAt), desc(guildMessages.id)).limit(50),
    db.select({ id: guildMessages.id }).from(guildMessages)
      .where(and(eq(guildMessages.memberId, member.id), eq(guildMessages.day, today))).limit(1),
  ]);
  return Response.json({ messages, postedToday: posted.length > 0, today }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const access = await authorizedMember(request);
  if (access.error) return access.error;
  const member = access.member!;
  const payload = await request.json().catch(() => null) as Record<string, unknown> | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 500) return apiError("Scrivi un messaggio da 1 a 500 caratteri", 400);
  const now = new Date();
  try {
    const [message] = await getDb().insert(guildMessages).values({
      id: crypto.randomUUID(), memberId: member.id, day: torinoDay(now), body,
      createdAt: now.toISOString(),
    }).returning();
    return Response.json({ message }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (isUniqueViolation(cause)) return apiError("Hai già scritto sulla bacheca oggi. Torna domani!", 409);
    throw cause;
  }
}
