import { and, desc, eq, exists, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { members, stageDecks, tournamentResults, tournamentStages } from "../../db/schema";
import { ownsThrone, type ChampionResponse } from "./reigning-champion";

export async function reigningChampion(memberId: string): Promise<ChampionResponse> {
    const db = getDb();
    // One statement = one consistent PostgreSQL snapshot, without BEGIN/SET/COMMIT
    // round-trips. The latest stage is chosen BEFORE filtering its winners.
    const stage = db.select({ slug: tournamentStages.slug, name: tournamentStages.name,
      eventDate: tournamentStages.eventDate, sourceUrl: tournamentStages.sourceUrl })
      .from(tournamentStages).where(exists(db.select({ one: sql`1` }).from(tournamentResults)
      .where(eq(tournamentResults.stageSlug, tournamentStages.slug))))
      .orderBy(desc(tournamentStages.eventDate), desc(tournamentStages.slug)).limit(1).as("latest_played_stage");
    const winners = await db.select({ memberId: tournamentResults.memberId, resultName: tournamentResults.displayName,
      resultUsername: tournamentResults.challongeUsername, username: members.challongeUsername,
      avatarStyle: members.avatarStyle, avatarColor: members.avatarColor, deck: stageDecks.beys,
      stageSlug: stage.slug, stageName: stage.name, eventDate: stage.eventDate, sourceUrl: stage.sourceUrl })
      .from(stage).innerJoin(tournamentResults, and(eq(tournamentResults.stageSlug, stage.slug), eq(tournamentResults.finalRank, 1)))
      .leftJoin(members, eq(members.id, tournamentResults.memberId))
      .leftJoin(stageDecks, and(eq(stageDecks.stageSlug, stage.slug), eq(stageDecks.memberId, tournamentResults.memberId)))
      .limit(2);
    // An ambiguous/missing winner grants nobody the special portrait.
    if (winners.length !== 1) return { champion: null, canUseThrone: false };
    const winner = winners[0];
    const champion = { memberId: winner.memberId, displayName: winner.username || winner.resultUsername || winner.resultName,
      avatarStyle: winner.avatarStyle ?? 0, avatarColor: winner.avatarColor ?? 0, deck: winner.deck,
      stage: { slug: winner.stageSlug, name: winner.stageName, eventDate: winner.eventDate, sourceUrl: winner.sourceUrl } };
    return { champion, canUseThrone: ownsThrone(champion, memberId) };
}
