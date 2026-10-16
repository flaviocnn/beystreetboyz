import { staffCheckinRequest } from "../../../lib/checkin-service";
import { treasuryOverview } from "../../../lib/treasury-service";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") || "1"), eventId = params.get("eventId");
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || (eventId !== null && (!eventId || eventId.length > 100))) {
    return Response.json({ error: "Filtro o pagina non validi" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return staffCheckinRequest(request, () => treasuryOverview(eventId, page));
}
