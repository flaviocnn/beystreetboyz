import { requestBody, staffCheckinRequest, updateCheckinParticipant } from "../../../../../../lib/checkin-service";
type Context = { params: Promise<{ id: string; participantId: string }> };
export async function PATCH(request: Request, context: Context) {
  return staffCheckinRequest(request, async actor => {
    const { id, participantId } = await context.params;
    return updateCheckinParticipant(id, participantId, await requestBody(request), actor);
  }, true);
}
