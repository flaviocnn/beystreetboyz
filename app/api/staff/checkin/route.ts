import { createCheckinEvent, listCheckinEvents, requestBody, staffCheckinRequest } from "../../../lib/checkin-service";
export const maxDuration = 60;
export async function GET(request: Request) { return staffCheckinRequest(request, listCheckinEvents); }
export async function POST(request: Request) { return staffCheckinRequest(request, async () => createCheckinEvent(await requestBody(request)), true); }
