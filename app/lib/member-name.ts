type NamedMember = { challongeUsername?: string | null; firstName: string; lastName?: string | null };

export function memberDisplayName(member: NamedMember): string {
  return member.challongeUsername?.trim() || [member.firstName, member.lastName].filter(Boolean).join(" ") || "Membro della Gilda";
}
