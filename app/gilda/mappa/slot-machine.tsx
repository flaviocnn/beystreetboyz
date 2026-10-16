"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SLOT_COST, SLOT_DAILY_LIMIT, SLOT_SYMBOLS, type SlotReels, type SlotResponse, type SlotState } from "../../lib/slot-machine";
import { createSlotRecovery } from "../../lib/slot-recovery";
import { invalidateGameData } from "../../lib/game-data";
import { readResponse } from "../../lib/client-api";
import { useGameAudio } from "../../lib/game-audio";
import "./slot-machine.css";

// Fallback for disabled browser storage; keys are scoped to the authenticated member.
const recovery = createSlotRecovery(() => sessionStorage);
function Reels({ values, busy = false }: { values: SlotReels; busy?: boolean }) {
  return <div className={`slot-reels ${busy ? "is-spinning" : ""}`} role="img" aria-label={busy ? "Giro in corso" : values.map(i => SLOT_SYMBOLS[i].name).join(" · ")}>
    {values.map((value, i) => <span key={i} style={{ color: SLOT_SYMBOLS[value].color }} aria-hidden="true">{SLOT_SYMBOLS[value].mark}</span>)}
  </div>;
}
export default function SlotMachine({ memberId }: { memberId: string }) {
  const [state, setState] = useState<SlotState | null>(null), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null), [error, setError] = useState("");
  const [result, setResult] = useState<SlotResponse["spin"] | null>(null), [cooling, setCooling] = useState(false);
  const inFlight = useRef(false), alive = useRef(true);
  const { playEffect } = useGameAudio();
  const load = useCallback(async () => {
    try {
      const data = await fetch("/api/member/slot", { cache: "no-store", signal: AbortSignal.timeout(15000) }).then(readResponse) as SlotState;
      if (alive.current) { setState(data); setError(""); }
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Slot non disponibile"); }
  }, []);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(() => { if (alive.current) { setPending(recovery.get(memberId)); void load(); } });
    return () => { alive.current = false; };
  }, [memberId, load]);
  useEffect(() => {
    const delay = state?.availableAt ? Math.max(0, new Date(state.availableAt).getTime() - Date.now()) : 0;
    const start = setTimeout(() => setCooling(delay > 0), 0);
    const end = setTimeout(() => setCooling(false), delay + 50);
    return () => { clearTimeout(start); clearTimeout(end); };
  }, [state]);
  async function spin() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    playEffect("spin");
    const key = recovery.requestKey(memberId, pending, () => crypto.randomUUID());
    recovery.remember(memberId, key); setPending(key);
    try {
      const response = await fetch("/api/member/slot", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestKey: key }) });
      if ([400, 409, 429].includes(response.status)) {
        // The server rejected this request without a committed round.
        recovery.clear(memberId, key); if (alive.current) setPending(null);
      }
      const data = await readResponse(response) as SlotResponse;
      recovery.clear(memberId, key); invalidateGameData();
      window.dispatchEvent(new Event("torino-beycoins-changed"));
      if (alive.current) { setState(data); setResult(data.spin); setPending(null); playEffect(data.spin.payout > data.spin.cost ? "win" : "message"); }
    } catch (cause) {
      if (alive.current) setError(recovery.get(memberId)
        ? "Esito non ricevuto. Recuperalo con il pulsante: lo stesso giro non verrà addebitato di nuovo."
        : cause instanceof Error ? cause.message : "Giro non disponibile");
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  const message = result ? result.payout > result.cost ? `Premio: ${result.payout} BC, di cui ${result.payout - result.cost} BC di guadagno netto.`
    : result.payout === result.cost ? "Una coppia: puntata restituita. Saldo invariato." : "Nessuna combinazione: 1 BC speso, nessun premio." : "Premi GIRA per giocare una sola volta.";
  const unavailable = busy || (!pending && (!state || state.balance < SLOT_COST || state.remaining === 0 || cooling));
  return <section className="guild-slot" aria-labelledby="slot-title">
    <header className="slot-heading"><div><p className="section-kicker">ARCADE DELLA GILDA</p><h3 id="slot-title">Beycoin Spin</h3></div><div className="slot-balance">SALDO<strong>{state ? `${state.balance} BC` : "…"}</strong></div></header>
    <p>Tre rulli, un giro alla volta. Solo Beycoin virtuali, senza valore monetario: non si acquistano e non si convertono in denaro o premi reali.</p>
    <div className="slot-cabinet"><div className="slot-marquee">✦ RANKED BEYSTREETBOYZ ✦</div>
      <Reels values={result?.reels ?? [0, 1, 3]} busy={busy} />
      <p className="slot-price">1 GIRO = {SLOT_COST} BEYCOIN</p>
      <button className="solid-button" data-audio="quiet" aria-disabled={unavailable} aria-busy={busy} onClick={() => { if (!unavailable) void spin(); }}>
        {busy ? "ATTENDO L’ESITO…" : pending ? "RECUPERA ESITO · NESSUN DOPPIO ADDEBITO" : cooling ? "ATTENDI UN MOMENTO…" : "GIRA · 1 BC"}
      </button>
    </div>
    <p className="slot-result" role="status" data-sound="manual" aria-atomic="true">{busy ? "Il server sta verificando il giro…" : message}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {state && <p>{state.remaining} giri disponibili oggi su {SLOT_DAILY_LIMIT}. Limite giornaliero, con reset a mezzanotte di Torino. Nessun giro automatico.</p>}
    {state && state.balance < 1 && !pending && <p>Ti servono Beycoin: completa le imprese della Gilda per guadagnarli.</p>}
    <button className="text-button" disabled={busy} onClick={() => void load()}>AGGIORNA SALDO ↻</button>
    <details className="slot-rules"><summary>REGOLE, PREMI E PROBABILITÀ</summary>
      <p>Ogni simbolo ha probabilità 1 su 4 su ciascun rullo, indipendentemente dagli altri. I premi indicati includono la puntata.</p>
      <ul><li>Tre Grifoni: 12 BC · probabilità 1/64 (1,5625%).</li><li>Tre simboli uguali di qualsiasi altro tipo: 4 BC · 3/64 (4,6875%).</li><li>Esattamente due simboli uguali: 1 BC restituito · 36/64 (56,25%).</li><li>Tre simboli diversi: 0 BC · 24/64 (37,5%).</li></ul>
      <p>Ritorno teorico: 93,75% della puntata su moltissimi giri, non una promessa per la tua sessione. Guadagno netto solo con tre simboli uguali (6,25% dei giri). Ogni giro è indipendente: perdere non rende più probabile vincere.</p>
    </details>
    {state && state.history.length > 0 && <details className="slot-history"><summary>I TUOI ULTIMI 10 GIRI</summary><ol>{state.history.map(row => <li key={row.id}>
      <span>{row.reels.map(i => SLOT_SYMBOLS[i].name).join(" · ")}<small>{new Date(row.createdAt).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" })}</small></span>
      <span>−{row.cost} BC / +{row.payout} BC<strong>Netto {row.payout - row.cost > 0 ? "+" : ""}{row.payout - row.cost} BC</strong></span>
    </li>)}</ol></details>}
  </section>;
}
