export type MemberInput = {
  firstName: string; lastName: string; fiscalCode: string; documentNumber: string;
  email: string | null; phone: string | null; challongeUsername: string | null; challongeId: string | null;
  membershipStatus: string; paymentMethod: string | null; paymentPaid: boolean; feeCents: number | null;
};
export function parseMemberInput(value: unknown): MemberInput | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const str = (key: string) => typeof data[key] === "string" ? (data[key] as string).trim() : "";
  const firstName = str("firstName"), lastName = str("lastName");
  const fiscalCode = str("fiscalCode").toUpperCase(), documentNumber = str("documentNumber").toUpperCase();
  const email = str("email").toLowerCase() || null, phone = str("phone").replace(/\s/g, "") || null;
  const challongeUsername = str("challongeUsername") || null, challongeId = str("challongeId") || null;
  const membershipStatus = str("membershipStatus") || "pending", paymentMethod = str("paymentMethod") || null;
  const paymentPaid = data.paymentPaid === true;
  const feeCents = data.feeCents === null || data.feeCents === undefined || data.feeCents === "" ? null : Number(data.feeCents);
  if (!firstName || !lastName || !fiscalCode || !documentNumber) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (firstName.length > 80 || lastName.length > 80 || fiscalCode.length > 32 || documentNumber.length > 40 || (email?.length || 0) > 254) return null;
  if ((phone && !/^\+?[0-9]{6,20}$/.test(phone)) || (challongeUsername && !/^[A-Za-z0-9_-]{1,80}$/.test(challongeUsername)) || (challongeId && !/^\d{1,30}$/.test(challongeId))) return null;
  if (!["pending", "registered"].includes(membershipStatus) || (paymentMethod && !["cash", "bank", "card", "other"].includes(paymentMethod))) return null;
  if (paymentPaid && !paymentMethod) return null;
  if (feeCents !== null && (!Number.isSafeInteger(feeCents) || feeCents < 0 || feeCents > 10000000)) return null;
  return { firstName, lastName, fiscalCode, documentNumber, email, phone, challongeUsername, challongeId, membershipStatus, paymentMethod, paymentPaid, feeCents };
}
export function apiError(message: string, status: number) { return Response.json({ error: message }, { status }); }
