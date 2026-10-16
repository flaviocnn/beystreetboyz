import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { beycoinBalance, beycoinHistory, lockBeycoinWallet } from "./beycoin-wallet";
import { getDb } from "../../db";
import { achievementActivity, achievementAudit, achievementProfiles, beycoinLedger, guildMessages, memberAchievements, stageDecks, tournamentResults, tournamentStages } from "../../db/schema";
import { BEYCOIN_REWARDS, achievementDefinition, achievementTitle, evaluateAchievements, type AchievementAlbum, type AchievementId, type AchievementStage } from "./achievements";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function recordAchievementActivity(tx: Tx, memberId: string, kind: "login" | "avatar") {
  await tx.insert(achievementActivity).values({ memberId, kind }).onConflictDoNothing();
}
async function reconcile(tx: Tx, memberId: string): Promise<AchievementAlbum> {
  const activities = await tx.select().from(achievementActivity).where(eq(achievementActivity.memberId, memberId));
  const messages = await tx.select({ id: guildMessages.id }).from(guildMessages).where(eq(guildMessages.memberId, memberId)).limit(1);
  const stages = await tx.select({
    slug: tournamentStages.slug, name: tournamentStages.name, eventDate: tournamentStages.eventDate,
    finalRank: tournamentResults.finalRank, deck: stageDecks.beys, version: stageDecks.version,
  }).from(tournamentResults).innerJoin(tournamentStages, eq(tournamentStages.slug, tournamentResults.stageSlug))
    .leftJoin(stageDecks, and(eq(stageDecks.stageSlug, tournamentResults.stageSlug), eq(stageDecks.memberId, tournamentResults.memberId)))
    .where(eq(tournamentResults.memberId, memberId));
  const earned = await tx.select().from(memberAchievements).where(eq(memberAchievements.memberId, memberId));
  const progress = evaluateAchievements({ loggedIn: activities.some(a => a.kind === "login"), avatarChanged: activities.some(a => a.kind === "avatar"), hasMessage: messages.length > 0, stages,
    manualAchievements: earned.filter(a => a.achievementId === "demon-slayer" && a.active).map(a => a.achievementId) });
  const newlyUnlocked: AchievementId[] = [], now = new Date();
  const achievements = [];
  let coinDelta = 0;
  for (const entry of progress) {
    const existing = earned.find(a => a.achievementId === entry.id);
    if (entry.id === "demon-slayer") entry.evidence = existing?.evidence ?? {};
    if (entry.qualified && !existing?.active) {
      newlyUnlocked.push(entry.id);
      await tx.insert(memberAchievements).values({ memberId, achievementId: entry.id, earnedAt: now, active: true, evidence: entry.evidence })
        .onConflictDoUpdate({ target: [memberAchievements.memberId, memberAchievements.achievementId], set: { active: true, evidence: entry.evidence, ruleVersion: 1 } });
    } else if (existing && (existing.active !== entry.qualified || JSON.stringify(existing.evidence) !== JSON.stringify(entry.evidence))) {
      await tx.update(memberAchievements).set({ active: entry.qualified, evidence: entry.evidence })
        .where(and(eq(memberAchievements.memberId, memberId), eq(memberAchievements.achievementId, entry.id)));
    }
    if (entry.qualified !== !!existing?.active && (existing || entry.qualified)) {
      await tx.insert(achievementAudit).values({ id: crypto.randomUUID(), memberId, achievementId: entry.id,
        action: entry.qualified ? existing ? "restore" : "unlock" : "revoke", evidence: entry.evidence });
    }
    const coinReward = existing?.coinReward || BEYCOIN_REWARDS[entry.id];
    if (entry.qualified !== (existing?.coinCredited ?? false)) {
      const revision = (existing?.coinRevision ?? 0) + 1, amount = entry.qualified ? coinReward : -coinReward;
      await tx.insert(beycoinLedger).values({ id: crypto.randomUUID(), memberId, achievementId: entry.id, revision, amount,
        reason: entry.qualified ? (existing?.coinRevision ?? 0) > 0 ? "restore" : "award" : "revoke" });
      await tx.update(memberAchievements).set({ coinReward, coinCredited: entry.qualified, coinRevision: revision })
        .where(and(eq(memberAchievements.memberId, memberId), eq(memberAchievements.achievementId, entry.id)));
      coinDelta += amount;
    }
    achievements.push({ ...entry, evidence: entry.id === "demon-slayer" ? existing?.evidence ?? {} : entry.evidence,
      earnedAt: entry.qualified ? (existing?.earnedAt ?? now).toISOString() : null, coinReward });
  }
  const activeIds = new Set(achievements.filter(a => a.qualified).map(a => a.id));
  const [profile] = await tx.select().from(achievementProfiles).where(eq(achievementProfiles.memberId, memberId));
  const showcase = (profile?.showcase ?? []).filter(id => activeIds.has(id));
  const titleId = profile?.titleId && activeIds.has(profile.titleId) && achievementTitle(profile.titleId) ? profile.titleId : null;
  if (profile && (profile.titleId !== titleId || JSON.stringify(profile.showcase) !== JSON.stringify(showcase))) {
    await tx.update(achievementProfiles).set({ showcase, titleId }).where(eq(achievementProfiles.memberId, memberId));
  }
  const balance = await beycoinBalance(tx, memberId), history = await beycoinHistory(tx, memberId);
  return { achievements, newlyUnlocked, showcase, titleId, beycoins: { balance, delta: coinDelta, history } };
}

export async function syncAchievements(memberId: string, profile?: { showcase: string[]; titleId: string | null }) {
  return getDb().transaction(async tx => {
    await lockBeycoinWallet(tx, memberId);
    // First authenticated use since this feature shipped, not an invented historical login.
    await recordAchievementActivity(tx, memberId, "login");
    const album = await reconcile(tx, memberId);
    if (!profile) return album;
    const active = new Set(album.achievements.filter(a => a.qualified).map(a => a.id as string));
    if (profile.showcase.length > 3 || new Set(profile.showcase).size !== profile.showcase.length || profile.showcase.some(id => !active.has(id) || !achievementDefinition(id))
      || (profile.titleId !== null && (!active.has(profile.titleId) || !achievementTitle(profile.titleId)))) return null;
    const values = { showcase: profile.showcase as AchievementId[], titleId: profile.titleId as AchievementId | null };
    await tx.insert(achievementProfiles).values({ memberId, ...values }).onConflictDoUpdate({ target: achievementProfiles.memberId, set: values });
    return { ...album, ...values };
  });
}

// Public opt-in cosmetics only. Re-evaluate the sources on read so a result/deck
// correction cannot leave somebody else's invalid badge visible in the ranking.
export async function publicAchievementShowcases() {
  // Batch the opt-in profiles AND their current qualification facts in one
  // snapshot/query. Never read wallets, passwords or private achievement history.
  const profiles = await getDb().select({ memberId: achievementProfiles.memberId, showcase: achievementProfiles.showcase, titleId: achievementProfiles.titleId,
    loggedIn: sql<boolean>`EXISTS(SELECT 1 FROM member_achievement_activity a WHERE a.member_id = member_achievement_profiles.member_id AND a.kind = 'login')`,
    avatarChanged: sql<boolean>`EXISTS(SELECT 1 FROM member_achievement_activity a WHERE a.member_id = member_achievement_profiles.member_id AND a.kind = 'avatar')`,
    hasMessage: sql<boolean>`EXISTS(SELECT 1 FROM guild_messages m WHERE m.member_id = member_achievement_profiles.member_id)`,
    demonSlayer: sql<boolean>`EXISTS(SELECT 1 FROM member_achievements a WHERE a.member_id = member_achievement_profiles.member_id AND a.achievement_id = 'demon-slayer' AND a.active)`,
    stages: sql<AchievementStage[]>`coalesce((SELECT jsonb_agg(jsonb_build_object(
      'slug', s.slug, 'name', s.name, 'eventDate', s.event_date,
      'finalRank', r.final_rank, 'deck', d.beys, 'version', d.version))
      FROM tournament_results r JOIN tournament_stages s ON s.slug = r.stage_slug
      LEFT JOIN stage_decks d ON d.stage_slug = r.stage_slug AND d.member_id = r.member_id
      WHERE r.member_id = member_achievement_profiles.member_id), '[]'::jsonb)`,
  }).from(achievementProfiles).where(sql`jsonb_array_length(${achievementProfiles.showcase}) > 0 OR ${achievementProfiles.titleId} IS NOT NULL`);
  const result = new Map<string, { badgeIds: AchievementId[]; title: string | null }>();
  for (const profile of profiles) {
    const owned = new Set(evaluateAchievements({
      loggedIn: profile.loggedIn, avatarChanged: profile.avatarChanged, hasMessage: profile.hasMessage, stages: profile.stages,
      manualAchievements: profile.demonSlayer ? ["demon-slayer"] : [],
    }).filter(a => a.qualified).map(a => a.id));
    result.set(profile.memberId, { badgeIds: profile.showcase.filter(id => owned.has(id)), title: profile.titleId && owned.has(profile.titleId) ? achievementTitle(profile.titleId) : null });
  }
  return result;
}
