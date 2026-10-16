import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { members } from "../../db/schema";
import { getSession } from "./auth";

export const publicMemberFields = {
  id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email, challongeUsername: members.challongeUsername,
  mustChangePassword: members.mustChangePassword, avatarStyle: members.avatarStyle, avatarColor: members.avatarColor,
};
export const staffMemberFields = {
  ...publicMemberFields, fiscalCode: members.fiscalCode, documentNumber: members.documentNumber,
  phone: members.phone, challongeUsername: members.challongeUsername, challongeId: members.challongeId,
  membershipStatus: members.membershipStatus, paymentMethod: members.paymentMethod,
  paymentPaid: members.paymentPaid, feeCents: members.feeCents, score: members.score, createdAt: members.createdAt,
  role: members.role,
};
export async function currentMember(request: Request) {
  const session = await getSession(request);
  if (session?.role !== "member") return null;
  const [member] = await getDb().select().from(members).where(eq(members.id, session.id)).limit(1);
  if (!member || member.authVersion !== session.version) return null;
  // A temporary local password must still be changed when used for password login.
  // OAuth already proves possession of the member's Challonge account.
  // Local impersonation only bypasses this view flag, never the stored password.
  return session.method === "challonge" || session.method === "local" ? { ...member, mustChangePassword: false } : member;
}
export function memberView(member: typeof members.$inferSelect) {
  const { id, firstName, lastName, email, challongeUsername, mustChangePassword, avatarStyle, avatarColor } = member;
  return { id, firstName, lastName, email, challongeUsername, mustChangePassword, avatarStyle, avatarColor };
}
