import { tournamentReference } from "./checkin";
import { BSB_COMMUNITY, UPCOMING_STATES, challongeEventDate, type ChallongeTournament } from "./challonge-tournament";
import { createAsyncCache } from "./async-cache";
import { createHash } from "node:crypto";
const upcomingCache = createAsyncCache<ChallongeTournament[]>(4);
export type RemoteParticipant = { participantId: string; displayName: string; username: string | null; registered: boolean };
type Json = Record<string, unknown>;
const object = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
class TournamentNotFound extends Error {}
async function providerGet(path: string, query: URLSearchParams) {
  const key = process.env.CHALLONGE_API_KEY;
  if (!key) throw new Error("Chiave API Challonge non configurata sul server. Contatta lo staff tecnico.");
  const url = new URL(`https://api.challonge.com/v2.1/${path}`);
  url.search = query.toString();
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000),
      headers: { Authorization: key, "Authorization-Type": "v1", Accept: "application/json", "Content-Type": "application/vnd.api+json" } });
  } catch { throw new Error("Challonge non risponde. Riprova tra poco: i pagamenti già registrati sono conservati."); }
  if (response.status === 404) throw new TournamentNotFound("Torneo non trovato o non accessibile all’account Challonge dello staff. Controlla il link e i permessi.");
  if (response.status === 401 || response.status === 403) throw new Error("Challonge ha rifiutato l’accesso. Verifica la chiave API e i permessi sul torneo.");
  if (response.status === 429) throw new Error("Limite richieste Challonge raggiunto. Riprova più tardi.");
  if (!response.ok) throw new Error("Importazione Challonge non riuscita. Nessun pagamento è stato modificato.");
  try { return object(await response.json()); } catch { throw new Error("Risposta Challonge non valida."); }
}
function tournamentQuery(community: string | null) {
  return new URLSearchParams({ include_community_tournaments: "1", ...(community ? { community_id: community } : {}) });
}
function tournamentMetadata(record: Json, reference: ReturnType<typeof tournamentReference>): ChallongeTournament {
  const attributes = object(record.attributes), timestamps = object(attributes.timestamps);
  const id = String(record.id ?? "");
  if (!/^\d{1,30}$/.test(id) || typeof attributes.name !== "string" || !attributes.name.trim()) throw new Error("Risposta torneo Challonge non valida.");
  const startsAt = typeof attributes.starts_at === "string" ? attributes.starts_at : typeof timestamps.starts_at === "string" ? timestamps.starts_at : null;
  let sourceUrl = reference.url;
  if (typeof attributes.full_challonge_url === "string") {
    try { sourceUrl = tournamentReference(attributes.full_challonge_url).url; } catch { /* Retain the validated input URL. */ }
  }
  return { id, name: attributes.name.trim().slice(0, 160), ref: reference.community ? `${reference.community}-${reference.ref}` : reference.ref, sourceUrl, community: reference.community, startsAt, eventDate: challongeEventDate(startsAt) };
}
export async function fetchTournament(input: string) {
  const reference = tournamentReference(input);
  // Community-owned tournaments created by the API-key owner are excluded
  // from user scope by default, even when looked up by their numeric ID.
  const path = `tournaments/${encodeURIComponent(reference.ref)}.json`;
  try {
    const body = await providerGet(path, tournamentQuery(reference.community));
    return tournamentMetadata(object(body.data), reference);
  } catch (error) {
    if (!(error instanceof TournamentNotFound) || reference.community) throw error;
    // The community also includes tournaments created by other organizers.
    const body = await providerGet(path, tournamentQuery(BSB_COMMUNITY.identifier));
    return { ...tournamentMetadata(object(body.data), reference), community: BSB_COMMUNITY.identifier };
  }
}
export async function fetchUpcomingTournaments(force = false) {
  const scope = createHash("sha256").update(process.env.CHALLONGE_API_KEY ?? "unconfigured").digest("hex");
  return upcomingCache.get(`${BSB_COMMUNITY.id}:${scope}`, 60000, loadUpcomingTournaments, force);
}
async function loadUpcomingTournaments() {
  const query = tournamentQuery(BSB_COMMUNITY.identifier);
  const tournaments: ChallongeTournament[] = [], ids = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    query.set("page", String(page)); query.set("per_page", "100");
    const result = await providerGet("tournaments.json", query);
    if (!Array.isArray(result.data)) throw new Error("Elenco tornei Challonge non valido.");
    for (const item of result.data) {
      const record = object(item), attr = object(record.attributes), relationships = object(record.relationships);
      const community = object(object(relationships.community).data);
      if (String(community.id ?? "") !== BSB_COMMUNITY.id || !UPCOMING_STATES.has(String(attr.state))) continue;
      const id = String(record.id ?? "");
      if (ids.has(id)) throw new Error("Elenco tornei duplicato: sincronizzazione annullata.");
      ids.add(id);
      tournaments.push(tournamentMetadata(record, tournamentReference(id)));
    }
    const meta = object(result.meta), pagination = object(meta.pagination), links = object(result.links);
    const hasNext = !!links.next || Number(meta.total_pages ?? pagination.total_pages ?? 0) > page || result.data.length === 100;
    if (!hasNext) return tournaments.sort((a, b) => (a.eventDate ?? "9999").localeCompare(b.eventDate ?? "9999") || a.name.localeCompare(b.name, "it"));
  }
  throw new Error("Elenco tornei troppo lungo: non posso garantire una sincronizzazione completa.");
}
export async function fetchRoster(input: string) {
  const tournament = await fetchTournament(input);
  const { id } = tournament;
  const query = tournamentQuery(tournament.community);
  const participants: RemoteParticipant[] = [];
  const ids = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    query.set("page", String(page)); query.set("per_page", "100");
    const result = await providerGet(`tournaments/${id}/participants.json`, query);
    if (!Array.isArray(result.data)) throw new Error("Elenco iscritti Challonge non valido.");
    for (const item of result.data) {
      const record = object(item), attr = object(record.attributes);
      const participantId = String(record.id ?? "");
      if (!/^\d{1,30}$/.test(participantId) || ids.has(participantId) || typeof attr.name !== "string" || !attr.name.trim()) throw new Error("Elenco Challonge incompleto o duplicato: importazione annullata.");
      ids.add(participantId);
      participants.push({ participantId, displayName: attr.name.trim().slice(0, 200),
        username: typeof attr.username === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(attr.username) ? attr.username : null,
        // active=false may mean eliminated, not unregistered. Membership in this
        // complete list is the registration signal; only a missing ID is removed.
        registered: true });
    }
    const meta = object(result.meta), pagination = object(meta.pagination), links = object(result.links);
    const totalPages = Number(meta.total_pages ?? pagination.total_pages ?? 0);
    const hasNext = !!links.next || totalPages > page || result.data.length === 100;
    if (!hasNext) return { ...tournament, participants };
    if (page === 20) throw new Error("Troppi iscritti: non posso garantire un’importazione completa.");
  }
  throw new Error("Importazione incompleta.");
}
