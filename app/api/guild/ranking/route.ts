import { getDb } from "../../../../db";
import { members, tournamentResults } from "../../../../db/schema";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";

export async function GET(request: Request) {
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda del Grifone", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const [membersList, results] = await Promise.all([
    getDb().select({ id: members.id, firstName: members.firstName, lastName: members.lastName, challongeUsername: members.challongeUsername, score: members.score }).from(members),
    getDb().select({ memberId: tournamentResults.memberId, stagePoints: tournamentResults.stagePoints, finalRank: tournamentResults.finalRank }).from(tournamentResults),
  ]);
  const byMember = new Map<string, { points: number[]; stageWins: number }>();
  for (const result of results) {
    if (!result.memberId) continue;
    const stats = byMember.get(result.memberId) ?? { points: [], stageWins: 0 };
    stats.points.push(result.stagePoints);
    if (result.finalRank === 1) stats.stageWins++;
    byMember.set(result.memberId, stats);
  }
  const ranking = membersList.map(member => {
    const stats = byMember.get(member.id) ?? { points: [], stageWins: 0 };
    const points = stats.points.sort((a, b) => b - a);
    return { ...member, stages: points.length, stageWins: stats.stageWins, best: points.slice(0, 3) };
  });
  const tieValues = (row: typeof ranking[number]) => [row.score, row.stageWins, row.best[0] ?? 0, row.best[1] ?? 0, row.best[2] ?? 0, row.stages];
  const compare = (a: typeof ranking[number], b: typeof ranking[number]) => {
    const aValues = tieValues(a), bValues = tieValues(b);
    for (let i = 0; i < aValues.length; i++) if (aValues[i] !== bValues[i]) return bValues[i] - aValues[i];
    return 0;
  };
  ranking.sort(compare);
  const ranked = ranking.map((row, index) => ({ ...row, rank: index > 0 && compare(row, ranking[index - 1]) === 0 ? 0 : index + 1 }));
  let tiedRank = 0;
  for (const row of ranked) {
    if (row.rank === 0) row.rank = tiedRank;
    else tiedRank = row.rank;
  }
  return Response.json({ ranking: ranked }, { headers: { "Cache-Control": "no-store" } });
}
