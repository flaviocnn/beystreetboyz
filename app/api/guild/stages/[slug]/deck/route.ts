import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { stageDecks, tournamentResults } from "../../../../../../db/schema";
import { currentMember } from "../../../../../lib/member-access";
import { sameOrigin } from "../../../../../lib/auth";
import { isTopEight, parseDeck } from "../../../../../lib/decks";
import { apiError } from "../../../../../lib/members";

type Context = { params: Promise<{ slug: string }> };
export async function PUT(request: Request, context: Context) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda del Grifone", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const text = await request.text();
  if (text.length > 12000) return apiError("Deck troppo grande", 413);
  const body = (() => { try { return JSON.parse(text); } catch { return null; } })();
  const deck = parseDeck(body?.deck), version = body?.version;
  if (!deck || !Number.isSafeInteger(version) || version < 0 || version > 2147483646) return apiError("Completa tutti e tre i beyblade con lama, ratchet e bit validi", 400);
  const { slug } = await context.params;
  return getDb().transaction(async tx => {
    // Serialize edits to the same personal deck, including the first insert.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${member.id + ":" + slug}, 0))`);
    // Lock the result while validating eligibility: a concurrent result import
    // cannot remove/change the placement between this check and the save.
    const [result] = await tx.select({ rank: tournamentResults.finalRank }).from(tournamentResults)
      .where(and(eq(tournamentResults.memberId, member.id), eq(tournamentResults.stageSlug, slug))).for("share");
    if (!result) return apiError("Tappa non presente nel tuo storico", 404);
    if (!isTopEight(result.rank)) return apiError("Puoi registrare il deck solo per le tappe concluse in top 8", 403);
    const where = and(eq(stageDecks.memberId, member.id), eq(stageDecks.stageSlug, slug));
    const [existing] = await tx.select().from(stageDecks).where(where);
    if ((existing?.version ?? 0) !== version) return apiError("Il deck è stato aggiornato in un’altra scheda. Ricarica lo storico prima di modificarlo.", 409);
    const values = { beys: deck, version: version + 1, updatedAt: new Date() };
    const [saved] = existing
      ? await tx.update(stageDecks).set(values).where(where).returning()
      : await tx.insert(stageDecks).values({ ...values, memberId: member.id, stageSlug: slug }).returning();
    return Response.json({ deck: saved.beys, version: saved.version, updatedAt: saved.updatedAt }, { headers: { "Cache-Control": "no-store" } });
  });
}
