import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { stageDecks, tournamentResults, tournamentStages } from "../../../../db/schema";
import { currentMember } from "../../../lib/member-access";
import { isTopEight } from "../../../lib/decks";
import { apiError } from "../../../lib/members";

export async function GET(request: Request) {
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda del Grifone", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const rows = await getDb().select({
    slug: tournamentStages.slug, name: tournamentStages.name, eventDate: tournamentStages.eventDate,
    sourceUrl: tournamentStages.sourceUrl, finalRank: tournamentResults.finalRank,
    stagePoints: tournamentResults.stagePoints, swissWins: tournamentResults.swissWins, swissLosses: tournamentResults.swissLosses,
    deck: stageDecks.beys, version: stageDecks.version, updatedAt: stageDecks.updatedAt,
  }).from(tournamentResults).innerJoin(tournamentStages, eq(tournamentStages.slug, tournamentResults.stageSlug))
    .leftJoin(stageDecks, and(eq(stageDecks.stageSlug, tournamentResults.stageSlug), eq(stageDecks.memberId, tournamentResults.memberId)))
    .where(eq(tournamentResults.memberId, member.id)).orderBy(desc(tournamentStages.eventDate), tournamentStages.slug);
  return Response.json({ stages: rows.map(row => ({ ...row, version: row.version ?? 0, eligible: isTopEight(row.finalRank) })) }, { headers: { "Cache-Control": "no-store" } });
}
