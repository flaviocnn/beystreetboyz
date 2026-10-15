import { readFile } from "node:fs/promises";
import { migrationClient } from "./database.mjs";

const path = process.argv[2];
if (!path) throw new Error("Uso: node --env-file=.env.local scripts/sync-tournament.mjs .local-data/psmc5x5-draft.json");
const data = JSON.parse(await readFile(path, "utf8"));
if (data.tournamentSlug !== "psmc5x5" || data.results?.length !== 24 || data.confirmedAttendance !== 24) {
  throw new Error("Tappa o numero dei presenti non verificati.");
}
const coefficientMilli = 1000;
const topPoints = [100, 85, 75, 68, 60, 55, 50, 45];
const groupPoints = [4, 8, 15, 25, 35];
const sourceKeys = new Set(), memberIds = new Set(), ranks = new Set();
const results = data.results.map(row => {
  const sourceKey = String(row.sourceChallongeUsername || row.challongeUsername || row.displayName).toLowerCase();
  if (sourceKeys.has(sourceKey)) throw new Error("Partecipante duplicato nella tappa.");
  sourceKeys.add(sourceKey);
  if (row.memberId) {
    if (memberIds.has(row.memberId)) throw new Error("Membro assegnato a più partecipanti.");
    memberIds.add(row.memberId);
  }
  const rank = row.finalRank;
  if (rank !== null) {
    if (!Number.isInteger(rank) || rank < 1 || rank > 8 || ranks.has(rank)) throw new Error("Piazzamenti finali incoerenti.");
    ranks.add(rank);
  }
  if (!Number.isInteger(row.wins) || !Number.isInteger(row.losses) || row.wins + row.losses !== 5 || row.ties !== 0) {
    throw new Error("Record di girone incompleto.");
  }
  const expectedBase = rank === null ? groupPoints[row.wins] : topPoints[rank - 1];
  if (expectedBase !== row.basePoints) throw new Error("Punti base incoerenti col regolamento.");
  return {
    sourceKey, displayName: row.displayName, challongeUsername: row.challongeUsername,
    sourceChallongeUsername: row.sourceChallongeUsername || row.challongeUsername,
    memberId: row.memberId, groupName: row.group,
    swissWins: row.wins, swissLosses: row.losses, finalRank: rank,
    basePoints: expectedBase, stagePoints: Math.round(expectedBase * coefficientMilli / 1000),
  };
});
if (ranks.size !== 8 || results.filter(row => row.memberId).length !== 24) throw new Error("Top 8 o associazioni incomplete.");
const grizzly = results.find(row => row.sourceKey === "nika37");
if (grizzly?.displayName !== "__Grizzly__" || grizzly.memberId !== "22550997-d3a1-4a0c-9ac0-94fa3d6ace32") {
  throw new Error("Correzione Nika37/Grizzly mancante.");
}
const db = migrationClient();
try {
  await db.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(847302902)`;
    // A migrated member can retain a newer production ID (e.g. an OAuth account).
    // Resolve only the explicit Challonge association, never a similar real name.
    const knownMembers = await tx`SELECT id, challonge_username FROM public.members`;
    for (const row of results) {
      if (!row.memberId) continue;
      const byId = knownMembers.find(m => m.id === row.memberId);
      if (!row.challongeUsername) {
        if (!byId) throw new Error("Risultato senza username e con ID non più presente: verificare l'associazione.");
        continue;
      }
      const byUsername = knownMembers.filter(m => m.challonge_username?.toLowerCase() === row.challongeUsername.toLowerCase());
      if (byUsername.length !== 1 || (byId && byId.id !== byUsername[0].id)) throw new Error("Associazione Challonge incoerente: verificare la scheda prima del sync.");
      row.memberId = byUsername[0].id;
    }
    memberIds.clear();
    for (const row of results) if (row.memberId) {
      if (memberIds.has(row.memberId)) throw new Error("Membro assegnato a più risultati dopo il collegamento OAuth.");
      memberIds.add(row.memberId);
    }
    const [prior] = await tx`SELECT count(*)::integer AS stages FROM public.tournament_stages`;
    if (prior.stages === 0) {
      const expectedScores = new Map(results.filter(row => row.memberId).map(row => [row.memberId, row.stagePoints]));
      const priorScores = await tx`SELECT id, score FROM public.members WHERE score <> 0`;
      if (priorScores.some(row => row.score !== expectedScores.get(row.id))) {
        throw new Error("Punteggi esistenti diversi da questa tappa: serve una riconciliazione prima della sincronizzazione.");
      }
    }
    const [known] = await tx`SELECT count(*)::integer AS members FROM public.members WHERE id = ANY(${[...memberIds]}::text[])`;
    if (known.members !== memberIds.size) throw new Error("Una o più schede membro non esistono.");
    await tx`INSERT INTO public.tournament_stages
      (slug, name, event_date, source_url, attendance, coefficient_milli)
      VALUES (${data.tournamentSlug}, ${data.name}, ${data.date}, ${data.source}, 24, ${coefficientMilli})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, event_date = EXCLUDED.event_date,
        source_url = EXCLUDED.source_url, attendance = EXCLUDED.attendance,
        coefficient_milli = EXCLUDED.coefficient_milli, synced_at = now()`;
    await tx`DELETE FROM public.tournament_results WHERE stage_slug = ${data.tournamentSlug}`;
    for (const row of results) {
      await tx`INSERT INTO public.tournament_results
        (stage_slug, source_key, display_name, challonge_username, source_challonge_username,
         member_id, group_name, swiss_wins, swiss_losses, final_rank, base_points, stage_points)
        VALUES (${data.tournamentSlug}, ${row.sourceKey}, ${row.displayName}, ${row.challongeUsername},
          ${row.sourceChallongeUsername}, ${row.memberId}, ${row.groupName}, ${row.swissWins},
          ${row.swissLosses}, ${row.finalRank}, ${row.basePoints}, ${row.stagePoints})`;
    }
    await tx`UPDATE public.members AS member SET score = COALESCE((
      SELECT sum(stage_points)::integer FROM (
        SELECT stage_points FROM public.tournament_results
        WHERE member_id = member.id ORDER BY stage_points DESC LIMIT 10
      ) AS best_ten
    ), 0)`;
  });
  console.log(`Tappa ${data.tournamentSlug} sincronizzata: 24 risultati associati a 24 membri. Risync idempotente.`);
} catch (error) {
  console.error(`Sincronizzazione annullata (${error.code || error.message}).`);
  process.exitCode = 1;
} finally { await db.end(); }
