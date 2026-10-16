"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDialogFocus } from "../lib/dialog-focus";
import { useGameAudio } from "../lib/game-audio";
import type { PlayerMember } from "../lib/client-api";
import { getGameSession } from "../lib/game-data";
import BankRoom, { type BankDesk } from "./bank-room";
import BankLedger from "./bank-ledger";
import "./bank.css";

const clerks = {
  ratilde: { name: "Ratilde, la cassiera", message: "Squitt! Ogni moneta ha la sua tappa. Quando lo staff conferma un nuovo pagamento nel check-in, lo ritrovi subito nel nostro registro. Tre euro di quota? Tre euro nel caveau. Mai due volte per lo stesso pagamento!" },
  rodi: { name: "Mastro Rodi, il revisore", message: "I baffi non mentono: contiamo i pagamenti, non le presenze. Un assente che ha pagato conserva il suo introito. Un pagamento annullato dallo staff esce dal totale, lasciando la traccia della correzione nel check-in. E le monete del tesseramento annuale? Quelle non sono incassi di tappa!" },
};
export default function GuildBank() {
  const [member, setMember] = useState<PlayerMember | undefined>(), [opened, setOpened] = useState<BankDesk | null>(null);
  const { enabled, toggle, playClick, playStep } = useGameAudio("guild");
  useDialogFocus(!!opened);
  const open = useCallback((desk: BankDesk) => setOpened(desk), []);
  useEffect(() => {
    const controller = new AbortController();
    void getGameSession().then(data => { if (data.member && !controller.signal.aborted) setMember(data.member); }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!opened) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpened(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [opened]);
  return <main className="interior-shell bank-shell">
    <header className="interior-topbar"><Link className="back-link" href="/">← MAPPA DI TORINO</Link><span>INTESA / TESORERIA DELLA GILDA</span><button className="text-button" onClick={toggle} aria-pressed={enabled}>AUDIO {enabled ? "ON" : "OFF"}</button></header>
    <div className="interior-container"><p className="section-kicker">MARMO, MONETE E BAFFI</p><h1>La Gringotts<br />della Gilda<span className="period">.</span></h1><p className="bank-intro">Benvenuto nella nuova Intesa: una banca-fantasy abitata da contabili-ratto, custodi degli introiti delle nostre tappe. Nessun servizio bancario reale, solo la tesoreria virtuale della Gilda.</p>
      <BankRoom avatar={member} paused={!!opened} onOpen={open} onStep={playStep} />
      <div className="bank-actions"><button className="outline-button" onClick={() => { playClick(); open("ratilde"); }}>PARLA CON RATILDE</button><button className="solid-button" onClick={() => { playClick(); open("ledger"); }}>CONSULTA IL REGISTRO INTROITI →</button><button className="outline-button" onClick={() => { playClick(); open("rodi"); }}>PARLA CON MASTRO RODI</button></div>
      <p className="bank-access-note">La sala è aperta a tutti. Importi, dettaglio dei pagamenti e riepiloghi sono riservati allo staff.</p>
    </div>
    {opened && <div className="guild-overlay" onMouseDown={() => setOpened(null)}><section className="ranking-card bank-dialog" role="dialog" aria-modal="true" aria-labelledby="bank-title" onMouseDown={event => event.stopPropagation()}><button className="close-button" aria-label="Chiudi" onClick={() => setOpened(null)}>×</button><p className="section-kicker">INTESA / {opened === "ledger" ? "TESORERIA DELLE TAPPE" : "IL BANCO DEI CONTABILI"}</p><h2 id="bank-title">{opened === "ledger" ? "Registro introiti" : clerks[opened].name}</h2>{opened === "ledger" ? <BankLedger /> : <><p className="bank-dialogue">{clerks[opened].message}</p><button className="solid-button" onClick={() => { playClick(); open("ledger"); }}>APRI IL REGISTRO →</button></>}</section></div>}
  </main>;
}
