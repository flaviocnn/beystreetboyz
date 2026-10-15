import { checkinEventDetail, staffCheckinRequest } from "../../../../lib/checkin-service";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return staffCheckinRequest(request, async () => checkinEventDetail((await context.params).id)); }
