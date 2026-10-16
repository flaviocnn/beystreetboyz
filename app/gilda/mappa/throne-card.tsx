"use client";
import { useEffect, useRef } from "react";
import type { ChampionState } from "../../lib/use-reigning-champion";
import { drawChampionThrone } from "../../lib/throne-art";
import { deckBeyText } from "../../lib/mirror-achievement";

export default function ThroneCard({ state }: { state: ChampionState }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const champion = state.champion;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, 520, 400); ctx.imageSmoothingEnabled = false;
    drawChampionThrone(ctx, 260, 235, champion, 0, 1.8);
  }, [champion]);
  return <div className="throne-card">
    <canvas ref={canvas} width={520} height={400} aria-label={champion ? `${champion.displayName}, campione in carica, incoronato sul trono` : "Trono in attesa del campione"} />
    {state.loading ? <p role="status">La Gilda cerca il suo campione…</p> : state.error ? <><p role="alert">{state.error}</p><button className="outline-button" onClick={() => void state.refresh()}>RIPROVA</button></> : champion ? <>
      <p className="section-kicker">CAMPIONE IN CARICA · 1° POSTO</p><h3>{champion.displayName}</h3>
      <p>{champion.stage.name} · <time dateTime={champion.stage.eventDate}>{new Date(champion.stage.eventDate + "T12:00:00Z").toLocaleDateString("it-IT")}</time></p>
      <p>Il trono resta suo fino ai risultati della tappa successiva. Un omaggio della Gilda, senza bonus in classifica.</p>
      {champion.deck ? <><h4>IL DECK DELLA TAPPA</h4><ul className="throne-deck">{champion.deck.map((bey, index) => <li key={index}>{deckBeyText(bey)}</li>)}</ul></> : <p>Il campione non ha ancora registrato il deck di questa tappa.</p>}
      {state.canUseThrone && <p className="archive-notice">Il trono è tuo! Nello Specchio dei blader puoi creare il ritratto speciale del campione.</p>}
      <a className="text-button" href={champion.stage.sourceUrl} target="_blank" rel="noopener noreferrer">TORNEO CHALLONGE ↗</a>
    </> : <p>Il trono attende il prossimo campione.</p>}
  </div>;
}
