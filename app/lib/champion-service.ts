import { and, desc, eq, exists, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { members, stageDecks, tournamentResults, tournamentStages } from "../../db/schema";
import { ownsThrone, type ChampionResponse } from "./reigning-champion";

export async function reigningChampion(memberId: string): Promise<ChampionResponse> {
  return getDb().transaction(async tx => {
    // Date order, not sync order: backfilling/reimporting an older stage must
    // never steal the throne. Check-in events are deliberately not consulted.
    const [stage] = await tx.select().from(tournamentStages).where(exists(tx.select({ one: sql`1` }).from(tournamentResults)
      .where(eq(tournamentResults.stageSlug, tournamentStages.slug))))
      .orderBy(desc(tournamentStages.eventDate), desc(tournamentStages.slug)).limit(1);
    if (!stage) return { champion: null, canUseThrone: false };
    const winners = await tx.select({ memberId: tournamentResults.memberId, resultName: tournamentResults.displayName,
      resultUsername: tournamentResults.challongeUsername, username: members.challongeUsername,
      avatarStyle: members.avatarStyle, avatarColor: members.avatarColor, deck: stageDecks.beys })
      .from(tournamentResults).leftJoin(members, eq(members.id, tournamentResults.memberId))
      .leftJoin(stageDecks, and(eq(stageDecks.stageSlug, stage.slug), eq(stageDecks.memberId, tournamentResults.memberId)))
      .where(and(eq(tournamentResults.stageSlug, stage.slug), eq(tournamentResults.finalRank, 1))).limit(2);
    // An ambiguous/missing winner grants nobody the special portrait.
    if (winners.length !== 1) return { champion: null, canUseThrone: false };
    const winner = winners[0];
    const champion = { memberId: winner.memberId, displayName: winner.username || winner.resultUsername || winner.resultName,
      avatarStyle: winner.avatarStyle ?? 0, avatarColor: winner.avatarColor ?? 0, deck: winner.deck,
      stage: { slug: stage.slug, name: stage.name, eventDate: stage.eventDate, sourceUrl: stage.sourceUrl } };
    return { champion, canUseThrone: ownsThrone(champion, memberId) };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
