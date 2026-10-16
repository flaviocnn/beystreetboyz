"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BLACKJACK_COST, cardFace, type BlackjackAction, type BlackjackState } from "../../lib/blackjack";
import { createBlackjackRecovery } from "../../lib/blackjack-recovery";
import { readResponse } from "../../lib/client-api";
import { invalidateGameData } from "../../lib/game-data";
import { useGameAudio } from "../../lib/game-audio";
import "./blackjack.css";

const recovery = createBlackjackRecovery(() => sessionStorage);
function Cards({ cards, label }: { cards: (number | null)[]; label: string }) {
  return <ul className="blackjack-cards" aria-label={label}>{cards.map((card, i) => {
    if (card === null) return <li key={i} className="blackjack-card is-hidden" aria-label="Carta coperta"><span aria-hidden="true">✦</span></li>;
    const face = cardFace(card);
    return <li key={i} className={`blackjack-card ${face.red ? "is-red" : ""}`} aria-label={`${face.rank} ${face.suit}`}>
      <span className="card-corner" aria-hidden="true">{face.rank}<small>{face.suit}</small></span><b aria-hidden="true">{face.suit}</b><span className="card-bottom" aria-hidden="true">{face.rank}</span>
    </li>;
  })}</ul>;
}
export default function Blackjack({ memberId }: { memberId: string }) {
  const [state, setState] = useState<BlackjackState | null>(null), [error, setError] = useState("");
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<BlackjackAction | null>(null);
  const alive = useRef(true), inFlight = useRef(false), { playEffect } = useGameAudio();
  const load = useCallback(async (clearError = true) => {
    try {
      const next = await fetch("/api/member/blackjack", { cache: "no-store", signal: AbortSignal.timeout(15000) }).then(readResponse) as BlackjackState;
      if (alive.current) { setState(next); if (clearError) setError(""); }
    } catch { if (alive.current) setError("Il tavolo non è disponibile. Riprova fra poco."); }
  }, []);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(() => { if (alive.current) { setPending(recovery.get(memberId)); void load(); } });
    return () => { alive.current = false; };
  }, [memberId, load]);
  async function act(action: "start" | "hit" | "stand") {
    if (inFlight.current) return;
    const hand = state?.hand;
    const input = pending ?? recovery.get(memberId) ?? (action === "start" ? { action, requestKey: crypto.randomUUID() } : hand ? { action, requestKey: crypto.randomUUID(), handId: hand.id, version: hand.version } : null);
    if (!input) return;
    inFlight.current = true; setBusy(true); setError(""); recovery.remember(memberId, input); setPending(input); playEffect("click");
    try {
      const response = await fetch("/api/member/blackjack", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if ([400, 409, 429].includes(response.status)) { recovery.clear(memberId, input.requestKey); if (alive.current) setPending(null); }
      const next = await readResponse(response) as BlackjackState;
      recovery.clear(memberId, input.requestKey); invalidateGameData(); window.dispatchEvent(new Event("torino-beycoins-changed"));
      if (alive.current) { setState(next); setPending(null); playEffect(next.hand?.status === "won" || next.hand?.status === "blackjack" ? "win" : "message"); }
    } catch (cause) {
      if (alive.current) {
        setError(recovery.get(memberId) ? "La partita è in sospeso. Premi Riprendi per continuare." : cause instanceof Error ? cause.message : "Il tavolo non è disponibile.");
        if (!recovery.get(memberId)) void load(false);
      }
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  const hand = state?.hand, playing = hand?.status === "playing";
  const message = !hand ? "Il banco ti aspetta." : playing ? "Carta o stai? La scelta è tua." : hand.status === "blackjack" ? "Blackjack! Hai vinto 5 Beycoin."
    : hand.status === "won" ? "Hai vinto 4 Beycoin!" : hand.status === "push" ? "Pareggio! I tuoi 2 Beycoin tornano a te." : hand.playerTotal > 21 ? "Hai superato 21. Questa mano va al banco." : "Vince il banco.";
  return <section className="guild-slot guild-blackjack" aria-labelledby="blackjack-title">
    <header className="slot-heading"><div><p className="section-kicker">IL TAVOLO DEL GRIFONE</p><h3 id="blackjack-title">Blackjack</h3></div><div className="slot-balance">SALDO<strong>{state ? `${state.balance} BC` : "…"}</strong></div></header>
    <p>Avvicinati a 21 e batti il banco, senza sballare.</p>
    <div className="blackjack-table" aria-busy={busy}>
      <div className="blackjack-hand-heading"><strong>IL BANCO</strong><span>{hand ? hand.dealerTotal ?? "?" : "—"}</span></div>
      <Cards cards={hand?.dealer ?? [null, null]} label="Carte del banco" />
      <div className="blackjack-table-mark" aria-hidden="true">♜ BEYSTREETBOYZ ♜</div>
      <div className="blackjack-hand-heading"><strong>LA TUA MANO</strong><span>{hand?.playerTotal ?? "—"}</span></div>
      <Cards cards={hand?.player ?? [null, null]} label="Le tue carte" />
      <div className="blackjack-controls" data-audio="quiet">
        {pending ? <button className="solid-button" aria-disabled={busy} onClick={() => { if (!busy) void act(pending.action); }}>{busy ? "UN MOMENTO…" : "RIPRENDI LA PARTITA"}</button>
          : playing ? <><button className="solid-button" aria-disabled={busy} onClick={() => { if (!busy) void act("hit"); }}>CARTA</button><button className="outline-button" aria-disabled={busy} onClick={() => { if (!busy) void act("stand"); }}>STAI</button></>
          : <button className="solid-button" aria-disabled={busy || !state || state.balance < BLACKJACK_COST || state.remaining === 0} onClick={() => { if (!busy && state && state.balance >= BLACKJACK_COST && state.remaining > 0) void act("start"); }}>{busy ? "DISTRIBUISCO…" : "GIOCA · 2 BC"}</button>}
      </div>
    </div>
    <p className="slot-result" role="status" data-sound="manual" aria-atomic="true">{busy ? "Il banco prepara le carte…" : message}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {state && <p>Partite rimaste oggi nella libreria: {state.remaining}/20.</p>}
    {state && !playing && state.balance < BLACKJACK_COST && !pending && <p>Servono 2 Beycoin. Conquista nuove imprese per guadagnarne!</p>}
    <button className="text-button" disabled={busy} onClick={() => void load()}>AGGIORNA TAVOLO ↻</button>
    <details className="slot-rules"><summary>COME SI GIOCA</summary><ul>
      <li>Ogni mano costa 2 Beycoin. “Carta” aggiunge una carta, “Stai” passa il turno al banco.</li>
      <li>Figure: 10. Asso: 1 oppure 11, come ti conviene. Oltre 21 perdi la mano.</li>
      <li>Il banco pesca fino a 16 e si ferma da 17, anche con un Asso da 11.</li>
      <li>Vittoria: 4 BC. Blackjack con le prime due carte: 5 BC. Pareggio: 2 BC restituiti. I premi includono la puntata.</li>
      <li>Un mazzo da 52 carte per mano. Niente raddoppio, divisione delle coppie o assicurazione.</li>
      <li>20 partite al giorno, insieme alla slot. I Beycoin sono monete di gioco, non scambiabili con denaro o premi reali.</li>
    </ul></details>
  </section>;
}
