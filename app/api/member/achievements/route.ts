import { sameOrigin } from "../../../lib/auth";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { syncAchievements } from "../../../lib/achievement-service";

async function access(request: Request) {
  if (!sameOrigin(request)) return { error: apiError("Richiesta non valida", 403) };
  const member = await currentMember(request);
  if (!member) return { error: apiError("Accedi alla Gilda del Grifone", 401) };
  if (member.mustChangePassword) return { error: apiError("Modifica prima la password temporanea", 403) };
  return { member };
}
export async function POST(request: Request) {
  const auth = await access(request); if (auth.error) return auth.error;
  return Response.json(await syncAchievements(auth.member!.id), { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(request: Request) {
  const auth = await access(request); if (auth.error) return auth.error;
  const raw = await request.text(); if (raw.length > 1500) return apiError("Richiesta troppo grande", 413);
  let body; try { body = JSON.parse(raw); } catch { return apiError("Richiesta non valida", 400); }
  if (!Array.isArray(body?.showcase) || body.showcase.length > 3 || body.showcase.some((id: unknown) => typeof id !== "string") || (body.titleId !== null && typeof body.titleId !== "string")) return apiError("Scegli fino a tre distintivi e un titolo valido", 400);
  const album = await syncAchievements(auth.member!.id, { showcase: body.showcase, titleId: body.titleId });
  if (!album) return apiError("Puoi esporre soltanto imprese e titoli che hai sbloccato", 400);
  return Response.json(album, { headers: { "Cache-Control": "no-store" } });
}
