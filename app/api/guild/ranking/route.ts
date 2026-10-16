import { getDb } from "../../../../db";
import { members, tournamentResults } from "../../../../db/schema";
import { currentMember } from "../../../lib/member-access";
import { apiError } from "../../../lib/members";
import { publicAchievementShowcases } from "../../../lib/achievement-service";
import { eq, isNotNull, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const member = await currentMember(request);
  if (!member) return apiError("Accedi alla Gilda del Grifone", 401);
  if (member.mustChangePassword) return apiError("Modifica prima la password temporanea", 403);
  const db = getDb();
  const stats = db.select({ memberId: tournamentResults.memberId,
    stages: sql<number>`count(*)::integer`.as("stages"),
    stageWins: sql<number>`count(*) FILTER (WHERE ${tournamentResults.finalRank} = 1)::integer`.as("stage_wins"),
    best: sql<number[]>`(array_agg(${tournamentResults.stagePoints} ORDER BY ${tournamentResults.stagePoints} DESC))[1:3]`.as("best"),
  }).from(tournamentResults).where(isNotNull(tournamentResults.memberId)).groupBy(tournamentResults.memberId).as("ranking_stats");
  const [membersList, showcases] = await Promise.all([
    db.select({ id: members.id, firstName: members.firstName, lastName: members.lastName, challongeUsername: members.challongeUsername, score: members.score,
      stages: sql<number>`coalesce(${stats.stages}, 0)`, stageWins: sql<number>`coalesce(${stats.stageWins}, 0)`,
      best: sql<number[]>`coalesce(${stats.best}, ARRAY[]::integer[])`,
    }).from(members).leftJoin(stats, eq(stats.memberId, members.id)),
    publicAchievementShowcases(),
  ]);
  const ranking = membersList.map(member => ({ ...member, achievements: showcases.get(member.id) ?? { badgeIds: [], title: null } }));
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
