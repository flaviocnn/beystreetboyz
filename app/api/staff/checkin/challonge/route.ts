import { checkinChallonge, staffCheckinRequest } from "../../../../lib/checkin-service";
export const maxDuration = 60;
export async function GET(request: Request) {
  return staffCheckinRequest(request, () => checkinChallonge(request));
}
