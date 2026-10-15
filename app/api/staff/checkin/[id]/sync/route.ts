import { staffCheckinRequest, syncCheckinEvent } from "../../../../../lib/checkin-service";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) { return staffCheckinRequest(request, async () => syncCheckinEvent((await context.params).id), true); }
