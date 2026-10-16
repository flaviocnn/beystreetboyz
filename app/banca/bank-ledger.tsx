"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { paymentLabels } from "../lib/checkin";
import type { TreasuryData } from "../lib/treasury";
const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (value: string) => new Date(value + "T12:00:00Z").toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
export default function BankLedger() {
  const [data, setData] = useState<TreasuryData | null>(null), [error, setError] = useState("");
  const [denied, setDenied] = useState(false), [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState(""), [page, setPage] = useState(1), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.hidden) return;
      const query = new URLSearchParams({ page: String(page), ...(eventId ? { eventId } : {}) });
      void fetch(`/api/staff/treasury?${query}`, { cache: "no-store", signal: controller.signal }).then(async response => {
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) { setDenied(true); setData(null); return; }
        const next = await response.json().catch(() => null);
        if (!response.ok || !next) throw new Error(next?.error || "Il registro non è disponibile. Riprova fra poco.");
        if (!controller.signal.aborted) { setData(next); setDenied(false); setError(""); }
      }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    };
    refresh(); const timer = window.setInterval(refresh, 15000); window.addEventListener("focus", refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [eventId, page, reload]);
  function selectEvent(id: string) { setLoading(true); setEventId(id); setPage(1); }
  if (denied) return <div className="bank-locked"><h3>Il registro è riservato allo staff.</h3><p>Accedi con un account abilitato o con la parola d’ordine del Palazzo dello staff, poi torna in banca. Per le password temporanee completa prima il cambio.</p><Link className="solid-button" href="/staff">ACCEDI AL PALAZZO DELLO STAFF →</Link><p>Puoi comunque visitare la sala e parlare con i contabili.</p></div>;
  return <div className="bank-ledger">
    <p>Gli introiti provengono dai pagamenti delle tappe confermati nel check-in. Con quota di 3 €, ogni nuovo “pagato e presente” registra 3 € una sola volta.</p>
    <button className="text-button" onClick={() => { setLoading(true); setReload(value => value + 1); }}>↻ AGGIORNA REGISTRO</button>
    {error && <p className="form-error" role="alert">{error}{data ? " I dati sotto sono l’ultima lettura riuscita." : ""}</p>}
    {loading && <p role="status">Il contabile sta ricontrollando il registro…</p>}
    {data && <>
      <div className="bank-totals"><div><small>INTROITI REGISTRATI · TUTTE LE TAPPE</small><strong>{money(data.summary.totalCents)}</strong></div><div><small>PAGAMENTI REGISTRATI</small><strong>{data.summary.receipts}</strong></div></div>
      <p className="bank-methods">Contanti {money(data.summary.cashCents)} · Carta {money(data.summary.cardCents)} · Bonifico {money(data.summary.bankCents)} · Altro {money(data.summary.otherCents)}</p>
      <h3>Incassi per tappa</h3>
      {!data.events.length ? <p>Il caveau aspetta la prima tappa. Nessun incasso è stato inventato o aggiunto.</p> : <div className="bank-event-list">{data.events.map(event => <button className={event.id === eventId ? "is-selected" : ""} key={event.id} onClick={() => selectEvent(event.id)}><span><strong>{event.name}</strong><small>{date(event.eventDate)} · quota {money(event.feeCents)} · {event.receipts} {event.receipts === 1 ? "pagamento" : "pagamenti"}</small></span><b>{money(event.totalCents)}</b></button>)}</div>}
      <label className="bank-filter">DETTAGLIO PAGAMENTI<select value={eventId} onChange={event => selectEvent(event.target.value)}><option value="">Tutte le tappe</option>{data.events.map(event => <option key={event.id} value={event.id}>{event.name} · {date(event.eventDate)}</option>)}</select></label>
      {data.filterEventId === eventId && data.page === page ? <>
      <p>{data.receiptCount} {data.receiptCount === 1 ? "pagamento" : "pagamenti"} nel filtro selezionato. Gli importi sono quelli effettivamente registrati, incluse eventuali quote diverse da 3 €.</p>
      <ol className="bank-receipts">{data.receipts.map(receipt => <li key={receipt.id}><div><strong>{receipt.challongeUsername || receipt.displayName}</strong><span>{receipt.eventName} · {date(receipt.eventDate)}</span><small>{receipt.method ? paymentLabels[receipt.method] : "Metodo non indicato"} · {receipt.operator || "Staff"}{receipt.paidAt ? ` · ${new Date(receipt.paidAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}` : ""}</small>{(!receipt.registered || receipt.presence !== "present") && <small>Pagamento mantenuto · {receipt.registered ? "presenza non confermata" : "non più iscritto"}</small>}</div><b>{money(receipt.amountCents ?? 0)}</b></li>)}</ol>
      {!data.receipts.length && <p>Nessun pagamento registrato in questo filtro.</p>}
      <div className="bank-pagination"><button className="outline-button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(value => value - 1); }}>← PRECEDENTI</button><span>Pagina {page} / {Math.max(1, Math.ceil(data.receiptCount / data.pageSize))}</span><button className="outline-button" disabled={page * data.pageSize >= data.receiptCount || loading} onClick={() => { setLoading(true); setPage(value => value + 1); }}>SUCCESSIVI →</button></div>
      </> : <p>I dettagli del filtro selezionato non sono ancora disponibili. Attendi il caricamento o aggiorna il registro.</p>}
      <p className="bank-footnote">Aggiornato: {new Date(data.updatedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}. Un assente pagato resta un introito; annullare il pagamento nel check-in lo esclude dal totale. Le correzioni restano nella cronologia del check-in. Nessun addebito o rimborso online.</p>
    </>}
  </div>;
}
