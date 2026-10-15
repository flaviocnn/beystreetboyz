import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { checkinAudit, checkinEvents, checkinParticipants, members } from "../../db/schema";
import { getSession, sameOrigin } from "./auth";
import { checkinSummary, paymentTransition, validEventDate } from "./checkin";
import { fetchRoster } from "./challonge-roster";
import { isUniqueViolation } from "./database-errors";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
class CheckinError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export async function staffCheckinRequest(request: Request, run: (actor: string) => Promise<unknown>, mutation = false) {
  try {
    if (mutation && !sameOrigin(request)) throw new CheckinError("Richiesta non valida", 403);
    const session = await getSession(request);
    if (session?.role !== "staff") throw new CheckinError("Accesso riservato allo staff", 401);
    return Response.json(await run(session.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CheckinError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    if (isUniqueViolation(error)) return Response.json({ error: "Torneo già collegato oppure profilo associato a più iscritti. Controlla le associazioni prima di riprovare." }, { status: 409 });
    return Response.json({ error: "Operazione non completata. Nessuna modifica parziale è stata salvata; aggiorna la pagina e riprova." }, { status: 500 });
  }
}
export async function requestBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 8000) throw new CheckinError("Richiesta troppo grande", 413);
  try { const body = JSON.parse(text); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); return body; }
  catch { throw new CheckinError("Dati non validi"); }
}
async function remoteRoster(input: string) {
  try { return await fetchRoster(input); }
  catch (error) { throw new CheckinError(error instanceof Error ? error.message : "Challonge non disponibile", 502); }
}
export async function listCheckinEvents() {
  const events = await getDb().select().from(checkinEvents).orderBy(desc(checkinEvents.eventDate), desc(checkinEvents.createdAt));
  return { events };
}
async function rosterIntoDb(tx: Tx, eventId: string, roster: Awaited<ReturnType<typeof fetchRoster>>) {
  const existing = await tx.select().from(checkinParticipants).where(eq(checkinParticipants.eventId, eventId));
  const people = await tx.select({ id: members.id, username: members.challongeUsername }).from(members);
  const byUsername = new Map(people.filter(m => m.username).map(m => [m.username!.toLowerCase(), m.id]));
  const byId = new Map(roster.participants.map(p => [p.participantId, p]));
  for (const row of existing) {
    const incoming = byId.get(row.participantId);
    const registered = incoming?.registered ?? false;
    const sameUsername = incoming?.username?.toLowerCase() === row.challongeUsername?.toLowerCase();
    const memberId = incoming ? incoming.username ? byUsername.get(incoming.username.toLowerCase()) ?? (sameUsername ? row.memberId : null) : null : row.memberId;
    const metadata = { registered, memberId, displayName: incoming?.displayName ?? row.displayName, challongeUsername: incoming ? incoming.username : row.challongeUsername };
    if (Object.entries(metadata).some(([key, value]) => row[key as keyof typeof row] !== value)) {
      await tx.update(checkinParticipants).set({ ...metadata, version: row.version + 1 }).where(eq(checkinParticipants.id, row.id));
    }
  }
  const known = new Set(existing.map(r => r.participantId));
  for (const incoming of roster.participants) if (!known.has(incoming.participantId)) {
    await tx.insert(checkinParticipants).values({ id: crypto.randomUUID(), eventId, participantId: incoming.participantId,
      displayName: incoming.displayName, challongeUsername: incoming.username, registered: incoming.registered,
      memberId: incoming.username ? byUsername.get(incoming.username.toLowerCase()) ?? null : null });
  }
  await tx.update(checkinEvents).set({ lastSyncedAt: new Date(), revision: sql`${checkinEvents.revision} + 1` }).where(eq(checkinEvents.id, eventId));
}
export async function createCheckinEvent(body: Record<string, unknown>) {
  if (typeof body.tournament !== "string" || body.tournament.length > 500 || !validEventDate(body.eventDate) || typeof body.feeCents !== "number" || !Number.isSafeInteger(body.feeCents) || body.feeCents < 0 || body.feeCents > 1000000 || (body.name !== undefined && (typeof body.name !== "string" || body.name.length > 160))) throw new CheckinError("Controlla link del torneo, data e quota della tappa.");
  const roster = await remoteRoster(body.tournament);
  const id = crypto.randomUUID();
  await getDb().transaction(async tx => {
    await tx.insert(checkinEvents).values({ id, tournamentId: roster.id, tournamentRef: roster.ref, sourceUrl: roster.sourceUrl,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : roster.name,
      eventDate: body.eventDate as string, feeCents: body.feeCents as number, lastSyncedAt: new Date() });
    await rosterIntoDb(tx, id, roster);
  });
  return checkinEventDetail(id);
}
export async function checkinEventDetail(id: string) {
  return getDb().transaction(async tx => {
    const [event] = await tx.select().from(checkinEvents).where(eq(checkinEvents.id, id));
    if (!event) throw new CheckinError("Tappa non trovata", 404);
    const participants = await tx.select().from(checkinParticipants).where(eq(checkinParticipants.eventId, id)).orderBy(checkinParticipants.displayName);
    const audit = await tx.select({ id: checkinAudit.id, participantId: checkinAudit.participantId, action: checkinAudit.action,
      operatorLabel: checkinAudit.operatorLabel, note: checkinAudit.note, createdAt: checkinAudit.createdAt }).from(checkinAudit)
      .where(eq(checkinAudit.eventId, id)).orderBy(desc(checkinAudit.createdAt), desc(checkinAudit.id)).limit(30);
    return { event, participants, summary: checkinSummary(participants), audit };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
export async function syncCheckinEvent(id: string) {
  const started = new Date();
  const [event] = await getDb().select().from(checkinEvents).where(eq(checkinEvents.id, id));
  if (!event) throw new CheckinError("Tappa non trovata", 404);
  const roster = await remoteRoster(event.tournamentId);
  if (roster.id !== event.tournamentId) throw new CheckinError("Il torneo restituito non coincide con la tappa.", 409);
  await getDb().transaction(async tx => {
    const [locked] = await tx.select().from(checkinEvents).where(eq(checkinEvents.id, id)).for("update");
    if (!locked) throw new CheckinError("Tappa non trovata", 404);
    if (locked.lastSyncedAt > started) throw new CheckinError("Un altro operatore ha già aggiornato gli iscritti. Ricarica la tappa.", 409);
    await rosterIntoDb(tx, id, roster);
  });
  return checkinEventDetail(id);
}
export async function updateCheckinParticipant(eventId: string, participantId: string, body: Record<string, unknown>, actor: string) {
  await getDb().transaction(async tx => {
    const [event] = await tx.select().from(checkinEvents).where(eq(checkinEvents.id, eventId)).for("update");
    if (!event) throw new CheckinError("Tappa non trovata", 404);
    const [row] = await tx.select().from(checkinParticipants).where(and(eq(checkinParticipants.eventId, eventId), eq(checkinParticipants.id, participantId))).for("update");
    if (!row) throw new CheckinError("Iscritto non trovato nella tappa", 404);
    let change;
    try { change = paymentTransition(row, body, event.feeCents); }
    catch (error) { throw new CheckinError(error instanceof Error && error.message === "stale" ? "La scheda è stata aggiornata da un altro operatore. Ricarica e riprova." : error instanceof Error ? error.message : "Dati non validi", error instanceof Error && error.message === "stale" ? 409 : 400); }
    if (change.unchanged) return;
    const state = (value: typeof row | typeof change.values) => ({ presence: value.presence, paymentStatus: value.paymentStatus, paidCents: value.paidCents,
      paymentMethod: value.paymentMethod, paidAt: value.paidAt, paidBy: value.paidBy, version: value.version });
    await tx.update(checkinParticipants).set(change.values).where(eq(checkinParticipants.id, row.id));
    await tx.insert(checkinAudit).values({ id: crypto.randomUUID(), eventId, participantId: row.id, action: String(body.action), actorId: actor,
      operatorLabel: change.operator, note: change.note, beforeState: state(row), afterState: state(change.values) });
    await tx.update(checkinEvents).set({ revision: sql`${checkinEvents.revision} + 1` }).where(eq(checkinEvents.id, eventId));
  });
  return checkinEventDetail(eventId);
}
