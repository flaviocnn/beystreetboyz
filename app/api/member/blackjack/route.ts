import { sameOrigin } from "../../../lib/auth";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { blackjackState, playBlackjack, BlackjackError } from "../../../lib/blackjack-service";
import { parseBlackjackAction } from "../../../lib/blackjack-recovery";
const headers = { "Cache-Control": "private, no-store" };
async function access(request: Request) {
  const member = await currentMember(request);
  if (!member) return { error: apiError("Accedi alla Gilda per giocare", 401) };
  if (member.mustChangePassword) return { error: apiError("Modifica prima la password temporanea", 403) };
  return { member };
}
export async function GET(request: Request) {
  const auth = await access(request); if (auth.error) return auth.error;
  return Response.json(await blackjackState(auth.member!.id), { headers });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const auth = await access(request); if (auth.error) return auth.error;
  if (Number(request.headers.get("content-length")) > 512) return apiError("Richiesta troppo grande", 413);
  const raw = await request.text(); if (raw.length > 512) return apiError("Richiesta troppo grande", 413);
  let body; try { body = JSON.parse(raw); } catch { return apiError("Riapri il tavolo e riprova", 400); }
  const input = parseBlackjackAction(body); if (!input) return apiError("Riapri il tavolo e riprova", 400);
  try { return Response.json(await playBlackjack(auth.member!.id, input), { headers }); }
  catch (error) { if (error instanceof BlackjackError) return apiError(error.message, error.status); throw error; }
}
