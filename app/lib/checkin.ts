export type Presence = "pending" | "present" | "absent";
export type PaymentMethod = "cash" | "card" | "bank" | "other";
export type CheckinRow = { id: string; eventId: string; participantId: string; displayName: string; challongeUsername: string | null; memberId: string | null; registered: boolean; presence: string; paymentStatus: string; paidCents: number | null; paymentMethod: string | null; paidAt: string | Date | null; paidBy: string | null; version: number };
export type CheckinEvent = { id: string; tournamentId: string; tournamentRef: string; sourceUrl: string; name: string; eventDate: string; feeCents: number; lastSyncedAt: string | Date; revision: number };
export type CheckinDetail = { event: CheckinEvent; participants: CheckinRow[]; summary: ReturnType<typeof checkinSummary>; audit: { id: string; participantId: string; action: string; operatorLabel: string; note: string; createdAt: string }[] };
export const paymentLabels: Record<string, string> = { cash: "Contanti", card: "Carta", bank: "Bonifico", other: "Altro" };
export const presenceLabels: Record<string, string> = { pending: "Da verificare", present: "Presente", absent: "Assente" };

export function checkinSummary(rows: Pick<CheckinRow, "registered" | "presence" | "paymentStatus" | "paidCents">[]) {
  const active = rows.filter(r => r.registered);
  const present = active.filter(r => r.presence === "present");
  const pending = active.filter(r => r.presence === "pending").length;
  const unpaidPresent = present.filter(r => r.paymentStatus !== "paid").length;
  const removedPresent = rows.filter(r => !r.registered && r.presence === "present").length;
  return { registered: active.length, present: present.length, paidPresent: present.filter(r => r.paymentStatus === "paid").length,
    pending, unpaidPresent, toVerify: pending + unpaidPresent + removedPresent,
    absent: active.filter(r => r.presence === "absent").length, removed: rows.length - active.length, removedPresent,
    paid: rows.filter(r => r.paymentStatus === "paid").length,
    collectedCents: rows.reduce((s, r) => s + (r.paymentStatus === "paid" ? r.paidCents ?? 0 : 0), 0),
    ready: present.length > 0 && pending === 0 && unpaidPresent === 0 && removedPresent === 0 };
}

export function parseFee(value: string) {
  const text = value.trim().replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(text)) return null;
  const [whole, decimal = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return cents <= 1000000 ? cents : null;
}
export function validEventDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function tournamentReference(input: string) {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{1,120}$/.test(text)) return { ref: text, community: null, url: `https://challonge.com/${text}` };
  let url: URL;
  try { url = new URL(text.includes("://") ? text : `https://${text}`); } catch { throw new Error("Inserisci il link o l’identificativo del torneo Challonge."); }
  if (url.protocol !== "https:" || url.port || url.username || url.password || !/^(?:[a-z0-9-]+\.)?challonge\.com$/.test(url.hostname) || url.hostname === "api.challonge.com") throw new Error("Usa un link HTTPS di challonge.com.");
  const paths = url.pathname.split("/").filter(Boolean);
  if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(paths[0] ?? "") && paths.length > 1) paths.shift();
  const ref = paths.shift();
  if (!ref || !/^[A-Za-z0-9_-]{1,120}$/.test(ref) || paths.length > 1 || (paths.length === 1 && !["standings", "participants", "bracket"].includes(paths[0]))) throw new Error("Link del torneo non valido.");
  const community = ["challonge.com", "www.challonge.com"].includes(url.hostname) ? null : url.hostname.split(".")[0];
  return { ref, community, url: `https://${community ? community + "." : ""}challonge.com/${ref}` };
}

export function paymentTransition(row: CheckinRow, body: Record<string, unknown>, feeCents: number, now = new Date()) {
  const operator = typeof body.operator === "string" ? body.operator.trim() : "";
  if (!operator || operator.length > 80) throw new Error("Indica il nome dell’operatore (massimo 80 caratteri).");
  if (!Number.isSafeInteger(body.version) || body.version !== row.version) throw new Error("stale");
  if (body.action !== "pay" && body.action !== "correct") throw new Error("Operazione non valida.");
  const presence = body.action === "pay" ? "present" : body.presence;
  const paymentStatus = body.action === "pay" ? "paid" : body.paymentStatus;
  if (!["pending", "present", "absent"].includes(String(presence)) || !["paid", "unpaid"].includes(String(paymentStatus))) throw new Error("Stato non valido.");
  if (!row.registered && presence === "present") throw new Error("Il giocatore non risulta più iscritto. Aggiorna Challonge prima di confermarlo presente.");
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (body.action === "correct" && (!note || note.length > 280)) throw new Error("Indica il motivo della correzione (massimo 280 caratteri).");
  const method = paymentStatus === "paid" ? body.paymentMethod : null;
  if (paymentStatus === "paid" && !Object.hasOwn(paymentLabels, String(method))) throw new Error("Scegli il metodo di pagamento.");
  const unchanged = row.presence === presence && row.paymentStatus === paymentStatus && row.paymentMethod === method;
  const paymentUnchanged = row.paymentStatus === "paid" && paymentStatus === "paid";
  return { unchanged, operator, note: body.action === "pay" ? "Pagamento e presenza confermati" : note,
    values: { presence: String(presence), paymentStatus: String(paymentStatus), paymentMethod: method as PaymentMethod | null,
      paidCents: paymentStatus === "paid" ? feeCents : null,
      paidAt: paymentStatus === "paid" ? paymentUnchanged ? row.paidAt ? new Date(row.paidAt) : now : now : null,
      paidBy: paymentStatus === "paid" ? paymentUnchanged ? row.paidBy : operator : null,
      version: row.version + 1 } };
}
