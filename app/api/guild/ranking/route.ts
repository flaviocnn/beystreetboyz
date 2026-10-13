import { asc, desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { getSession } from "../../../lib/auth";
import { apiError } from "../../../lib/members";

export async function GET(request: Request) {
  const session = await getSession(request);
  if (session?.role !== "member") return apiError("Accedi alla Gilda del Grifone", 401);
  const rows = await getDb().select({ id: members.id, firstName: members.firstName, lastName: members.lastName, score: members.score }).from(members).orderBy(desc(members.score), asc(members.lastName), asc(members.firstName));
  if (!rows.some((row) => row.id === session.id)) return apiError("Account non più disponibile", 401);
  return Response.json({ ranking: rows }, { headers: { "Cache-Control": "no-store" } });
}
