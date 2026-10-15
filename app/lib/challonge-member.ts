import { eq, or, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { challongeIdentities, members } from "../../db/schema";
import { hashPassword } from "./auth";

export async function resolveChallongeMember(profile: { id: string; username: string }) {
  return getDb().transaction(async tx => {
    // Serialize binding, including concurrent first logins for the same identity.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(847302902)`);
    const [identity] = await tx.select().from(challongeIdentities).where(eq(challongeIdentities.challongeId, profile.id));
    const matches = await tx.select().from(members).where(or(eq(members.challongeId, profile.id), sql`lower(${members.challongeUsername}) = ${profile.username.toLowerCase()}`)).for("update");
    if (matches.length > 1 || (identity && matches.some(m => m.id !== identity.memberId))) throw new Error("account_conflict");
    let member = identity ? (await tx.select().from(members).where(eq(members.id, identity.memberId)).for("update"))[0] : matches[0];
    if (member) {
      const [otherIdentity] = await tx.select().from(challongeIdentities).where(eq(challongeIdentities.memberId, member.id));
      if ((otherIdentity && otherIdentity.challongeId !== profile.id) || (!identity && member.challongeId && member.challongeId !== profile.id)) throw new Error("account_conflict");
      [member] = await tx.update(members).set({ challongeId: profile.id, challongeUsername: profile.username }).where(eq(members.id, member.id)).returning();
    } else {
      const salt = crypto.randomUUID();
      [member] = await tx.insert(members).values({
        id: crypto.randomUUID(), firstName: profile.username, lastName: null,
        challongeId: profile.id, challongeUsername: profile.username,
        passwordSalt: salt, passwordHash: await hashPassword(crypto.randomUUID() + crypto.randomUUID(), salt),
        membershipStatus: "unknown", paymentPaid: null, createdAt: new Date().toISOString(),
      }).returning();
    }
    if (!identity) await tx.insert(challongeIdentities).values({ challongeId: profile.id, memberId: member.id });
    return member;
  });
}
