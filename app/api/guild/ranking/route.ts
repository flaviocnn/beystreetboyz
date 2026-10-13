import { asc, desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";

export async function GET(request: Request) {
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda del Grifone", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const rows = await getDb().select({ id: members.id, firstName: members.firstName, lastName: members.lastName, score: members.score }).from(members).orderBy(desc(members.score), asc(members.lastName), asc(members.firstName));
  return Response.json({ ranking: rows }, { headers: { "Cache-Control": "no-store" } });
}
