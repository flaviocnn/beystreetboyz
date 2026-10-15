import { tournamentReference } from "./checkin";
export type RemoteParticipant = { participantId: string; displayName: string; username: string | null; registered: boolean };
type Json = Record<string, unknown>;
const object = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
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
  if (response.status === 404) throw new Error("Torneo non trovato o non accessibile all’account Challonge dello staff. Controlla il link e i permessi.");
  if (response.status === 401 || response.status === 403) throw new Error("Challonge ha rifiutato l’accesso. Verifica la chiave API e i permessi sul torneo.");
  if (response.status === 429) throw new Error("Limite richieste Challonge raggiunto. Riprova più tardi.");
  if (!response.ok) throw new Error("Importazione Challonge non riuscita. Nessun pagamento è stato modificato.");
  try { return object(await response.json()); } catch { throw new Error("Risposta Challonge non valida."); }
}
export async function fetchRoster(input: string) {
  const reference = tournamentReference(input);
  const query = new URLSearchParams(reference.community ? { community_id: reference.community } : {});
  // Community-owned tournaments created by the API-key owner are excluded
  // from user scope by default, even when looked up by their numeric ID.
  query.set("include_community_tournaments", "1");
  const body = await providerGet(`tournaments/${encodeURIComponent(reference.ref)}.json`, query);
  const tournament = object(body.data), attributes = object(tournament.attributes);
  const id = String(tournament.id ?? "");
  if (!/^\d{1,30}$/.test(id) || typeof attributes.name !== "string") throw new Error("Risposta torneo Challonge non valida.");
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
    if (!hasNext) return { id, name: attributes.name.slice(0, 160), ref: reference.community ? `${reference.community}-${reference.ref}` : reference.ref, sourceUrl: reference.url, participants };
    if (page === 20) throw new Error("Troppi iscritti: non posso garantire un’importazione completa.");
  }
  throw new Error("Importazione incompleta.");
}
