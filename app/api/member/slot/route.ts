import { sameOrigin } from "../../../lib/auth";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { playSlot, slotState, SlotError } from "../../../lib/slot-service";
import { validSlotKey } from "../../../lib/slot-machine";

const headers = { "Cache-Control": "private, no-store" };
async function access(request: Request) {
  const member = await currentMember(request);
  if (!member) return { error: apiError("Accedi alla Gilda per giocare", 401) };
  if (member.mustChangePassword) return { error: apiError("Modifica prima la password temporanea", 403) };
  return { member };
}
export async function GET(request: Request) {
  const auth = await access(request); if (auth.error) return auth.error;
  return Response.json(await slotState(auth.member!.id), { headers });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Richiesta non valida", 403);
  const auth = await access(request); if (auth.error) return auth.error;
  if (Number(request.headers.get("content-length")) > 256) return apiError("Richiesta troppo grande", 413);
  const raw = await request.text(); if (raw.length > 256) return apiError("Richiesta troppo grande", 413);
  let body; try { body = JSON.parse(raw); } catch { return apiError("Richiesta non valida", 400); }
  if (!body || Object.keys(body).length !== 1 || !validSlotKey(body.requestKey)) return apiError("Identificativo giro non valido", 400);
  try { return Response.json(await playSlot(auth.member!.id, body.requestKey), { headers }); }
  catch (error) { if (error instanceof SlotError) return apiError(error.message, error.status); throw error; }
}
