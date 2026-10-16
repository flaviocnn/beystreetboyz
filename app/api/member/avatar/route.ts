import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { memberAchievements, members } from "../../../../db/schema";
import { sameOrigin } from "../../../lib/auth";
import { currentMember, memberView } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { AVATAR_COLORS, AVATAR_STYLES } from "../../../lib/pixel-player";
import { recordAchievementActivity } from "../../../lib/achievement-service";
import { DEMON_ACHIEVEMENT, isDemonicStyle } from "../../../lib/avatar-unlocks";
import { lockBeycoinWallet } from "../../../lib/beycoin-wallet";
export async function GET(request: Request) {
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const [grant] = await getDb().select({ active: memberAchievements.active }).from(memberAchievements)
    .where(and(eq(memberAchievements.memberId, member.id), eq(memberAchievements.achievementId, DEMON_ACHIEVEMENT)));
  return Response.json({ demonUnlocked: grant?.active === true }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof body?.avatarStyle !== "number" || !Number.isInteger(body.avatarStyle) || body.avatarStyle < 0 || body.avatarStyle >= AVATAR_STYLES.length || typeof body?.avatarColor !== "number" || !Number.isInteger(body.avatarColor) || body.avatarColor < 0 || body.avatarColor >= AVATAR_COLORS.length) return apiError("Avatar non valido", 400);
  const avatarStyle = body.avatarStyle, avatarColor = body.avatarColor;
  const updated = await getDb().transaction(async tx => {
    await lockBeycoinWallet(tx, member.id);
    if (isDemonicStyle(avatarStyle)) {
      const [grant] = await tx.select({ active: memberAchievements.active }).from(memberAchievements)
        .where(and(eq(memberAchievements.memberId, member.id), eq(memberAchievements.achievementId, DEMON_ACHIEVEMENT)));
      if (!grant?.active) return null;
    }
    const [previous] = await tx.select().from(members).where(eq(members.id, member.id)).for("update");
    const [saved] = await tx.update(members).set({ avatarStyle, avatarColor }).where(eq(members.id, member.id)).returning();
    if (previous.avatarStyle !== avatarStyle || previous.avatarColor !== avatarColor) await recordAchievementActivity(tx, member.id, "avatar");
    return saved;
  });
  if (!updated) return apiError("Conquista “Sconfiggi il Demone!” per usare questa skin.", 403);
  return Response.json({ member: memberView(updated) }, { headers: { "Cache-Control": "no-store" } });
}
