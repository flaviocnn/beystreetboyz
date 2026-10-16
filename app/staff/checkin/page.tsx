"use client";

import "./checkin.css";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseFee, paymentLabels, presenceLabels, type CheckinDetail, type CheckinEvent, type CheckinRow } from "../../lib/checkin";
import type { ChallongeTournament } from "../../lib/challonge-tournament";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const stamp = (value: string | Date) => new Date(value).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const dateLabel = (value: string) => new Date(value + "T12:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw Object.assign(new Error(result?.error || "Operazione non completata. Riprova tra poco."), { status: response.status });
  return result;
}

export default function StageCheckin() {
  const [access, setAccess] = useState<"loading" | "locked" | "unlocked">("loading");
  const [passphrase, setPassphrase] = useState("");
  const [events, setEvents] = useState<CheckinEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [detail, setDetail] = useState<CheckinDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [operator, setOperator] = useState("Staff");
  const [method, setMethod] = useState("cash");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("verify");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", tournament: "", eventDate: "", fee: "3,00" });
  const [upcoming, setUpcoming] = useState<ChallongeTournament[]>([]), [upcomingLoaded, setUpcomingLoaded] = useState(false);
  const [upcomingSelection, setUpcomingSelection] = useState("");
  const [metadata, setMetadata] = useState<{ input: string; tournament: ChallongeTournament } | null>(null);
  const [metadataError, setMetadataError] = useState("");
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [metadataReload, setMetadataReload] = useState(0);
  const [editing, setEditing] = useState<CheckinRow | null>(null);
  const selectedId = useRef("");
  useEffect(() => { selectedId.current = eventId; }, [eventId]);
  const acceptDetail = useCallback((next: CheckinDetail) => {
    if (selectedId.current !== next.event.id) return;
    setDetail(current => !current || current.event.id !== next.event.id || next.event.revision >= current.event.revision ? next : current);
  }, []);
  const loadEvents = useCallback(async () => {
    const data = await api("/api/staff/checkin");
    setEvents(data.events);
    setAccess("unlocked");
    setEventId(current => current || data.events[0]?.id || "");
    setShowCreate(data.events.length === 0);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEvents).catch(cause => {
      if (cause.status !== 401) setError(cause.message);
      setAccess("locked");
    });
    // Preferences are local to this staff device, not the identity of an account.
    void Promise.resolve().then(() => {
      setForm(current => ({ ...current, eventDate: today() }));
      try { setOperator(localStorage.getItem("bsbz-checkin-operator") || "Staff"); } catch { /* Private browsing may disable storage. */ }
    });
  }, [loadEvents]);

  useEffect(() => {
    const input = form.tournament.trim();
    if (access !== "unlocked" || !input) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setMetadataBusy(true); setMetadataError("");
      void api(`/api/staff/checkin/challonge?tournament=${encodeURIComponent(input)}`, { signal: controller.signal }).then(data => {
        if (controller.signal.aborted) return;
        const tournament = data.tournament as ChallongeTournament;
        setMetadata({ input, tournament });
        setForm(current => ({ ...current, name: tournament.name, eventDate: tournament.eventDate ?? current.eventDate }));
      }).catch(cause => {
        if (!controller.signal.aborted) setMetadataError(cause.message);
      }).finally(() => { if (!controller.signal.aborted) setMetadataBusy(false); });
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.tournament, access, metadataReload]);

  async function syncTournaments() {
    setBusy("tournaments"); setError(""); setNotice("");
    try {
      const data = await api("/api/staff/checkin/challonge");
      setUpcoming(data.tournaments); setUpcomingLoaded(true);
      setNotice(data.tournaments.length === 1 ? "1 torneo non ancora iniziato trovato nella community BeyStreetBoyz." : `${data.tournaments.length} tornei non ancora iniziati trovati nella community BeyStreetBoyz.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sincronizzazione tornei non riuscita"); }
    finally { setBusy(""); }
  }
  function chooseTournament(id: string) {
    setUpcomingSelection(id); setMetadataError(""); setMetadataBusy(false);
    const tournament = upcoming.find(item => item.id === id);
    if (!tournament) { setMetadata(null); setForm(current => ({ ...current, tournament: "", name: "", eventDate: today() })); return; }
    // Use the stable ID: it remains valid even if Challonge renames the URL.
    setMetadata({ input: tournament.id, tournament });
    setForm(current => ({ ...current, name: tournament.name, tournament: tournament.id, eventDate: tournament.eventDate ?? today() }));
  }

  useEffect(() => {
    if (!eventId || access !== "unlocked") return;
    const controller = new AbortController();
    const refresh = () => {
      if (document.hidden) return;
      void api(`/api/staff/checkin/${eventId}`, { signal: controller.signal }).then(acceptDetail).catch(cause => {
        if (cause.name !== "AbortError") setError(cause.message);
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [eventId, access, acceptDetail]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault(); setBusy("login"); setError("");
    try {
      await api("/api/staff/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase }) });
      setPassphrase(""); await loadEvents();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Accesso non riuscito"); }
    finally { setBusy(""); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    const feeCents = parseFee(form.fee);
    if (feeCents === null) { setError("Indica una quota valida, ad esempio 3,00."); return; }
    if (!metadata || metadata.input !== form.tournament.trim() || metadataBusy) { setError("Attendi la verifica del torneo su Challonge prima di creare la tappa."); return; }
    setBusy("create");
    try {
      const next: CheckinDetail = await api("/api/staff/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, feeCents }) });
      await loadEvents();
      selectedId.current = next.event.id; setEventId(next.event.id); setDetail(next);
      setShowCreate(false); setFilter("verify"); setSearch("");
      setForm({ name: "", tournament: "", eventDate: today(), fee: "3,00" });
      setMetadata(null); setUpcomingSelection("");
      setNotice(`Tappa creata: ${next.summary.registered} iscritti importati. Nessun pagamento è stato presunto.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Creazione non riuscita"); }
    finally { setBusy(""); }
  }
  async function sync() {
    setBusy("sync"); setError(""); setNotice("");
    try {
      const next = await api(`/api/staff/checkin/${eventId}/sync`, { method: "POST" });
      acceptDetail(next); setNotice("Iscritti aggiornati. Presenze e pagamenti già registrati sono stati conservati.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Importazione non riuscita"); }
    finally { setBusy(""); }
  }
  async function update(row: CheckinRow, values: Record<string, unknown>) {
    setBusy(row.id); setError(""); setNotice("");
    try {
      const next = await api(`/api/staff/checkin/${eventId}/participants/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, version: row.version, operator }) });
      acceptDetail(next); setEditing(null);
      setNotice(values.action === "pay" ? `Pagamento di ${row.challongeUsername || row.displayName} registrato: ${money(next.event.feeCents)}. Presenza confermata.` : "Correzione salvata nella cronologia.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 409) setEditing(null);
      try { acceptDetail(await api(`/api/staff/checkin/${eventId}`)); } catch { /* Keep the last readable snapshot. */ }
    } finally { setBusy(""); }
  }
  const current = detail?.event.id === eventId ? detail : null;
  const visible = current?.participants.filter(row => {
    if (!`${row.challongeUsername || ""} ${row.displayName}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "removed") return !row.registered;
    if (!row.registered) return false;
    if (filter === "verify") return row.presence === "pending" || (row.presence === "present" && row.paymentStatus !== "paid");
    if (filter === "paid") return row.paymentStatus === "paid";
    if (filter === "absent") return row.presence === "absent";
    return true;
  }) ?? [];

  return <main className="interior-shell checkin-shell">
    <header className="interior-topbar"><Link href="/staff" className="back-link">← PALAZZO DELLO STAFF</Link><span>RANKED BEYSTREETBOYZ</span></header>
    <div className="interior-container">
      <p className="section-kicker">IL BANCO DELLA TAPPA</p><h1>Check-in<span className="period">.</span></h1>
      <p className="checkin-intro">Una lista, un controllo. Iscrizione Challonge, presenza e quota della tappa nello stesso posto.</p>
      {access === "loading" ? <p role="status">Controllo l’accesso staff…</p> : access === "locked" ? <section className="auth-card"><h2>Accesso staff</h2><p>Accedi con il tuo account abilitato per entrare senza parola d’ordine. Se usi una password temporanea, cambiala prima.</p><Link className="solid-button" href="/gilda">ACCEDI CON IL TUO ACCOUNT →</Link><p>Oppure usa la parola d’ordine dello staff.</p><form className="stack-form" onSubmit={unlock}><label>PAROLA D’ORDINE<input type="password" autoComplete="current-password" required value={passphrase} onChange={e => setPassphrase(e.target.value)} /></label><button className="solid-button" disabled={!!busy}>ENTRA NEL CHECK-IN →</button></form></section> : <>
        <div className="checkin-toolbar"><label>TAPPA<select value={eventId} onChange={e => { setEventId(e.target.value); setEditing(null); setSearch(""); setError(""); setNotice(""); }} disabled={!!busy}><option value="" disabled>Seleziona una tappa</option>{events.map(event => <option key={event.id} value={event.id}>{dateLabel(event.eventDate)} · {event.name}</option>)}</select></label><button className="outline-button" disabled={!!busy} onClick={() => setShowCreate(!showCreate)} aria-expanded={showCreate}>{showCreate ? "CHIUDI NUOVA TAPPA" : "+ NUOVA TAPPA"}</button></div>
        {showCreate && <section className="checkin-create">
          <div><p className="section-kicker">COLLEGA UN TORNEO</p><h2>Apri il banco</h2><p>Sincronizza i prossimi tornei della community BeyStreetBoyz e scegli quello della tappa. Puoi anche incollare un link o ID manualmente. Il nome viene sempre letto da Challonge.</p></div>
          <form className="stack-form" onSubmit={create}>
            <div className="checkin-tournament-picker"><label>PROSSIMI TORNEI · BEYSTREETBOYZ<select value={upcomingSelection} onChange={e => chooseTournament(e.target.value)} disabled={!!busy}><option value="">Seleziona un torneo o inserisci il link sotto</option>{upcoming.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.eventDate ? dateLabel(tournament.eventDate) : "Data da definire"} · {tournament.name}</option>)}</select></label><button type="button" className="outline-button" disabled={!!busy} onClick={() => void syncTournaments()}>{busy === "tournaments" ? "SINCRONIZZO…" : "SINCRONIZZA"}</button></div>
            <p className="checkin-field-hint">{upcomingLoaded ? upcoming.length ? "Elenco aggiornato da Challonge. Include solo tornei non ancora iniziati della community." : "Nessun torneo non ancora iniziato trovato nella community. Puoi inserire un link manualmente." : "Premi Sincronizza per leggere i tornei della community. Nessuna tappa o pagamento viene creato dalla sincronizzazione."}</p>
            <label>LINK O ID TORNEO CHALLONGE<input required maxLength={500} disabled={!!busy} value={form.tournament} onChange={e => { setUpcomingSelection(""); setMetadata(null); setMetadataError(""); setMetadataBusy(false); setForm({ ...form, tournament: e.target.value, name: "", eventDate: today() }); }} placeholder="https://challonge.com/…" autoCapitalize="none" spellCheck={false} /></label>
            <label>NOME TAPPA · AUTOMATICO DA CHALLONGE<input readOnly maxLength={160} value={form.name} placeholder="Il nome comparirà dopo la verifica del torneo" /></label>
            {metadataBusy && <p className="checkin-field-hint" role="status">Leggo nome e data da Challonge…</p>}
            {metadataError && <div role="alert"><p className="form-error">{metadataError}</p><button type="button" className="text-button" disabled={!!busy} onClick={() => setMetadataReload(value => value + 1)}>RIPROVA LETTURA TORNEO</button></div>}
            <div className="checkin-form-pair"><label>DATA DELLA TAPPA<input type="date" required disabled={!!busy || metadataBusy} value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} /></label><label>QUOTA DELLA TAPPA (€)<input required disabled={!!busy} inputMode="decimal" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} placeholder="3,00" /></label></div>
            {metadata?.input === form.tournament.trim() && <p className="checkin-field-hint">{metadata.tournament.eventDate ? "Data precompilata da Challonge nel fuso Europe/Rome. Puoi modificarla prima di creare la tappa." : "Challonge non indica una data: verifica e imposta manualmente quella della tappa."}</p>}
            <button className="solid-button" disabled={!!busy || metadataBusy || metadata?.input !== form.tournament.trim()}>{busy === "create" ? "IMPORTO DA CHALLONGE…" : "CREA TAPPA E IMPORTA ISCRITTI →"}</button>
          </form>
        </section>}
        {!eventId && !showCreate && <p>Nessuna tappa: collega un torneo per iniziare.</p>}
        {eventId && !current && <p role="status">Carico gli iscritti…</p>}
        {current && <>
          <div className="checkin-heading"><div><p className="section-kicker">{dateLabel(current.event.eventDate)}</p><h2>{current.event.name}</h2><p>{money(current.event.feeCents)} a giocatore · <a href={current.event.sourceUrl} target="_blank" rel="noreferrer">Apri torneo Challonge ↗</a></p></div><div className="checkin-sync"><button className="outline-button" onClick={() => void sync()} disabled={!!busy}>{busy === "sync" ? "AGGIORNAMENTO…" : "↻ AGGIORNA ISCRITTI"}</button><small>Ultima importazione: {stamp(current.event.lastSyncedAt)}</small></div></div>
          <div className="checkin-stats" aria-label="Riepilogo tappa"><div><strong>{current.summary.registered}</strong><span>Iscritti</span></div><div><strong>{current.summary.paidPresent}</strong><span>Presenti e pagati</span></div><div className={current.summary.toVerify ? "stat-warning" : ""}><strong>{current.summary.toVerify}</strong><span>Da verificare</span></div><div><strong>{current.summary.absent}</strong><span>Assenti</span></div><div><strong>{money(current.summary.collectedCents)}</strong><span>Incassato registrato</span></div></div>
          <div className={`checkin-readiness ${current.summary.ready ? "ready" : "waiting"}`} role="status"><strong>{current.summary.ready ? "✓ Tutti i presenti hanno pagato — pronto per iniziare" : "Controllo pre-torneo da completare"}</strong><p>{current.summary.ready ? "Aggiorna gli iscritti un’ultima volta prima di iniziare il torneo su Challonge." : `${current.summary.pending} presenze da verificare · ${current.summary.unpaidPresent} presenti non pagati${current.summary.removedPresent ? ` · ${current.summary.removedPresent} presenti non più iscritti` : ""}. Conferma chi arriva e segna esplicitamente gli assenti.`}</p><small>Il torneo si avvia su Challonge. La quota della tappa è separata dal tesseramento annuale.</small></div>
          {current.summary.removed > 0 && <p className="checkin-removed-note">{current.summary.removed} {current.summary.removed === 1 ? "giocatore non risulta più iscritto" : "giocatori non risultano più iscritti"}. Storico e pagamenti sono conservati nel filtro “Non più iscritti”.</p>}
          <div className="checkin-desk"><label>OPERATORE<input maxLength={80} value={operator} onChange={e => { setOperator(e.target.value); try { localStorage.setItem("bsbz-checkin-operator", e.target.value); } catch {} }} placeholder="Es. Flavio" /></label><label>METODO PER IL PROSSIMO INCASSO<select value={method} onChange={e => setMethod(e.target.value)}>{Object.entries(paymentLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><p>Stai registrando un pagamento ricevuto in loco. Nessun addebito online.</p></div>
          <div className="checkin-find"><label>CERCA GIOCATORE<input type="search" placeholder="Username Challonge o nome" value={search} onChange={e => setSearch(e.target.value)} /></label><label>MOSTRA<select value={filter} onChange={e => setFilter(e.target.value)}><option value="verify">Da verificare</option><option value="all">Tutti gli iscritti</option><option value="paid">Pagati</option><option value="absent">Assenti</option><option value="removed">Non più iscritti</option></select></label></div>
          <section className="checkin-list" aria-label="Giocatori della tappa">{visible.length === 0 ? <div className="empty-list">{filter === "verify" && !search ? "Nessun iscritto da verificare in questo filtro." : "Nessun giocatore trovato."}</div> : visible.map(row => <article className={`checkin-player ${row.paymentStatus === "paid" ? "is-paid" : ""}`} key={row.id}>
            <div className="checkin-player-name"><h3>{row.challongeUsername || row.displayName}</h3>{row.challongeUsername && row.displayName !== row.challongeUsername && <p>{row.displayName}</p>}<small>{row.memberId ? "Membro della Gilda" : "Ospite / profilo non associato"} · ID iscritto {row.participantId}</small><div className="checkin-badges"><span>{row.registered ? "Iscritto" : "Non più iscritto"}</span><span>{presenceLabels[row.presence]}</span><span className={row.paymentStatus === "paid" ? "badge-paid" : "badge-unpaid"}>{row.paymentStatus === "paid" ? "Pagato" : "Non pagato"}</span></div>{row.paymentStatus === "paid" && row.paidAt && <small>{money(row.paidCents ?? 0)} · {paymentLabels[row.paymentMethod || ""]} · {row.paidBy} · {stamp(row.paidAt)}</small>}</div>
            <div className="checkin-player-actions">{row.registered && !(row.paymentStatus === "paid" && row.presence === "present") && <button className="solid-button" disabled={!!busy || !operator.trim()} onClick={() => void update(row, { action: "pay", paymentMethod: row.paymentStatus === "paid" ? row.paymentMethod : method })}>{busy === row.id ? "SALVO…" : row.paymentStatus === "paid" ? "CONFERMA PRESENZA ✓" : `PAGATO E PRESENTE · ${money(current.event.feeCents)}`}</button>}{row.registered && row.presence === "pending" && row.paymentStatus === "unpaid" && <button className="text-button" disabled={!!busy || !operator.trim()} onClick={() => void update(row, { action: "correct", presence: "absent", paymentStatus: "unpaid", note: "Assenza confermata dallo staff all’ingresso" })}>SEGNA ASSENTE</button>}<button className="text-button" disabled={!!busy} onClick={() => setEditing(row)}>PRESENZA / CORREGGI ↗</button></div>
          </article>)}</section>
          <details className="checkin-history"><summary>CRONOLOGIA · ULTIME {current.audit.length} OPERAZIONI</summary>{current.audit.length === 0 ? <p>Nessuna operazione registrata.</p> : <ol>{current.audit.map(item => <li key={item.id}><strong>{current.participants.find(p => p.id === item.participantId)?.challongeUsername || current.participants.find(p => p.id === item.participantId)?.displayName}</strong><span>{item.note}</span><small>{item.operatorLabel} · {stamp(item.createdAt)}</small></li>)}</ol>}</details>
        </>}
      </>}
      {(error || notice) && <div className={`checkin-message ${error ? "form-error" : "checkin-success"}`} role={error ? "alert" : "status"}>{error || notice}<button type="button" aria-label="Chiudi messaggio" onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
    </div>
    {editing && current && <Correction key={`${editing.id}-${editing.version}`} row={editing} feeCents={current.event.feeCents} busy={!!busy} error={error} onCancel={() => setEditing(null)} onSave={values => void update(editing, values)} />}
  </main>;
}

function Correction({ row, feeCents, busy, error, onCancel, onSave }: { row: CheckinRow; feeCents: number; busy: boolean; error: string; onCancel: () => void; onSave: (values: Record<string, unknown>) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [presence, setPresence] = useState(row.presence);
  const [payment, setPayment] = useState(row.paymentStatus);
  const [method, setMethod] = useState(row.paymentMethod || "cash");
  const [note, setNote] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="checkin-dialog" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><form className="stack-form" onSubmit={e => { e.preventDefault(); onSave({ action: "correct", presence, paymentStatus: payment, paymentMethod: payment === "paid" ? method : null, note }); }}><p className="section-kicker">PRESENZA E CORREZIONI</p><h2>{row.challongeUsername || row.displayName}</h2><label>PRESENZA<select value={presence} onChange={e => setPresence(e.target.value)}><option value="pending">Da verificare</option><option value="present" disabled={!row.registered}>Presente</option><option value="absent">Assente</option></select></label><label>PAGAMENTO DELLA TAPPA<select value={payment} onChange={e => setPayment(e.target.value)}><option value="unpaid">Non pagato</option><option value="paid">Pagato · {money(feeCents)}</option></select></label>{payment === "paid" && <label>METODO<select value={method} onChange={e => setMethod(e.target.value)}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}<label>MOTIVO / NOTA<input required maxLength={280} value={note} onChange={e => setNote(e.target.value)} placeholder="Es. Assente confermato / pagamento segnato per errore" /></label><p>Le modifiche restano in cronologia. Segnare “Non pagato” annulla la registrazione: un eventuale rimborso va effettuato fisicamente.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="solid-button" disabled={busy}>{busy ? "SALVO…" : "SALVA CORREZIONE →"}</button><button type="button" className="text-button" disabled={busy} onClick={onCancel}>ANNULLA</button></form></dialog>;
}
