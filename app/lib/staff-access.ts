import { getSession } from "./auth";
import { currentMember } from "./member-access";

// Preserve the member session for the Guild. Staff authorization is resolved
// server-side on every request so deletions, resets and role revocations apply.
export async function staffSession(request: Request) {
  const session = await getSession(request);
  if (session?.role === "staff") return session;
  if (session?.role !== "member") return null;
  const member = await currentMember(request);
  if (!member || member.role !== "staff" || member.mustChangePassword) return null;
  return { ...session, role: "staff" as const };
}
