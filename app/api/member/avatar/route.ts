import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { members } from "../../../../db/schema";
import { sameOrigin } from "../../../lib/auth";
import { currentMember, memberView } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { AVATAR_COLORS, AVATAR_STYLES } from "../../../lib/pixel-player";
export async function PUT(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof body?.avatarStyle !== "number" || !Number.isInteger(body.avatarStyle) || body.avatarStyle < 0 || body.avatarStyle >= AVATAR_STYLES.length || typeof body?.avatarColor !== "number" || !Number.isInteger(body.avatarColor) || body.avatarColor < 0 || body.avatarColor >= AVATAR_COLORS.length) return apiError("Avatar non valido", 400);
  const [updated] = await getDb().update(members).set({ avatarStyle: body.avatarStyle, avatarColor: body.avatarColor }).where(eq(members.id, member.id)).returning();
  return Response.json({ member: memberView(updated) }, { headers: { "Cache-Control": "no-store" } });
}
