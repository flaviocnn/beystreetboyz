export type MemberInput = {
  firstName: string;
  lastName: string;
  fiscalCode: string;
  documentNumber: string;
  email: string;
};

export function parseMemberInput(value: unknown): MemberInput | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const firstName = typeof data.firstName === "string" ? data.firstName.trim() : "";
  const lastName = typeof data.lastName === "string" ? data.lastName.trim() : "";
  const fiscalCode = typeof data.fiscalCode === "string" ? data.fiscalCode.trim().toUpperCase() : "";
  const documentNumber = typeof data.documentNumber === "string" ? data.documentNumber.trim().toUpperCase() : "";
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!firstName || !lastName || !fiscalCode || !documentNumber || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (firstName.length > 80 || lastName.length > 80 || fiscalCode.length > 32 || documentNumber.length > 40 || email.length > 254) return null;
  return { firstName, lastName, fiscalCode, documentNumber, email };
}

export function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
