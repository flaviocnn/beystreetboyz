"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { readResponse, type PlayerMember } from "../lib/client-api";
import { ACHIEVEMENTS, BEYCOIN_REWARDS, achievementDefinition, achievementTitle, type AchievementAlbum, type AchievementId } from "../lib/achievements";
import { drawAchievementHouse } from "../lib/achievement-house";
import { memberDisplayName } from "../lib/member-name";
import { useGameAudio } from "../lib/game-audio";
import "./imprese.css";

function HousePortrait() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = "#cbd7b4"; ctx.fillRect(0, 0, 600, 220);
    for (let x = 6; x < 600; x += 23) for (let y = 6; y < 215; y += 19) { ctx.fillStyle = "#adbe99"; ctx.fillRect(x, y, 3, 4); }
    ctx.fillStyle = "#e0e5cf"; ctx.fillRect(0, 190, 600, 30); drawAchievementHouse(ctx, 300, 159);
  }, []);
  return <canvas ref={canvas} width={600} height={220} role="img" aria-label="La Casa delle Imprese, con trofei in vetrina e un ingresso centrale" />;
}
export default function AchievementHouse() {
  const [member, setMember] = useState<PlayerMember | null>(null), [album, setAlbum] = useState<AchievementAlbum | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<AchievementId>("welcome"), [busy, setBusy] = useState(false);
  const [showcase, setShowcase] = useState<AchievementId[]>([]), [titleId, setTitleId] = useState<AchievementId | "">("");
  const { enabled, toggle, playClick } = useGameAudio("guild");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const session = await readResponse(await fetch("/api/member/session", { cache: "no-store", signal }));
      if (signal?.aborted) return;
      setError("");
      setMember(session.member);
      if (!session.member || session.member.mustChangePassword) { setAlbum(null); return; }
      const data = await readResponse(await fetch("/api/member/achievements", { method: "POST", cache: "no-store", signal })) as AchievementAlbum;
      if (signal?.aborted) return;
      setAlbum(data); setShowcase(data.showcase); setTitleId(data.titleId ?? "");
    } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Album non disponibile"); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => load(controller.signal)); return () => controller.abort(); }, [load]);
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setNotice(""); playClick();
    try {
      const data = await readResponse(await fetch("/api/member/achievements", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showcase, titleId: titleId || null }) })) as AchievementAlbum;
      setAlbum(data); setShowcase(data.showcase); setTitleId(data.titleId ?? ""); setNotice("Vetrina salvata. I tuoi distintivi e il titolo compaiono nel profilo in classifica e possono accompagnarti nello specchio.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito"); }
    finally { setBusy(false); }
  }
  const unlocked = album?.achievements.filter(a => a.qualified) ?? [];
  const definition = achievementDefinition(selected)!, progress = album?.achievements.find(a => a.id === selected);
  return <main className="interior-shell achievement-shell">
    <header className="interior-topbar"><Link href="/">← MAPPA DI TORINO</Link><Link href="/gilda/mappa">GILDA ↗</Link><button className="guild-audio-toggle" aria-pressed={enabled} onClick={toggle} aria-label={enabled ? "Disattiva audio" : "Attiva audio"}>♫ {enabled ? "ON" : "OFF"}</button></header>
    <div className="achievement-container"><section className="achievement-entrance"><HousePortrait /><div><p className="section-kicker">RANKED BEYSTREETBOYZ</p><h1>Casa delle<br />Imprese<span className="period">.</span></h1><p>Il tuo percorso, un distintivo alla volta.</p></div></section>
      {loading ? <p role="status">Apro il tuo album…</p> : !member || member.mustChangePassword ? <section className="auth-card"><h2>Il tuo sigillo è richiesto.</h2><p>{member ? "Cambia prima la password temporanea." : "Accedi per scoprire i tuoi achievement personali."}</p><a className="solid-button" href="/gilda">ACCEDI ALLA GILDA →</a></section> : album && <>
        <section className="beycoin-wallet" aria-labelledby="beycoin-title"><div><p className="section-kicker">IL TUO PORTAMONETE</p><h2 id="beycoin-title">Beycoin</h2><p>Ogni impresa vale monete. Per ora le raccogli: gli utilizzi arriveranno in seguito.</p></div><strong aria-label={`${album.beycoins.balance} Beycoin`}>{album.beycoins.balance}<small>BC</small></strong>
          <details><summary>REGISTRO BEYCOIN</summary><p>Valuta virtuale, separata da euro e punti di campionato. Premi già sbloccati inclusi. Una revoca genera uno storno; un ripristino recupera lo stesso premio, senza duplicarlo.</p>
            {album.beycoins.history.length ? <ol>{album.beycoins.history.map(movement => <li key={movement.id}><div><b>{achievementDefinition(movement.achievementId)?.name ?? "Impresa"}</b><small>{movement.reason === "revoke" ? "Storno" : movement.reason === "restore" ? "Ripristino" : "Premio"} · {new Date(movement.createdAt).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" })}</small></div><strong>{movement.amount > 0 ? "+" : ""}{movement.amount} BC</strong></li>)}</ol> : <p>Nessun movimento ancora registrato.</p>}<small>Ultimi 50 movimenti. Il saldo comprende l’intero registro.</small>
          </details>
        </section>
        <section className="achievement-album" aria-labelledby="album-title"><header className="achievement-album-heading"><div><p className="section-kicker">{memberDisplayName(member)}</p><h2 id="album-title">Il mio album</h2></div><strong>{unlocked.length} / {ACHIEVEMENTS.length}</strong></header>
          <progress max={ACHIEVEMENTS.length} value={unlocked.length} aria-label="Imprese sbloccate" />
          <p className="achievement-help">Scegli un distintivo per vedere requisiti e ricompense. Il progresso si aggiorna dalle tue azioni e dai risultati ufficiali. Nessun punto extra in campionato.</p>
          <div className="achievement-grid">{ACHIEVEMENTS.map(a => { const p = album.achievements.find(row => row.id === a.id)!; return <button className={`achievement-tile ${p.qualified ? "is-earned" : ""}`} key={a.id} aria-pressed={selected === a.id} onClick={() => { setSelected(a.id); playClick(); }}><span className="achievement-emblem" aria-hidden="true">{a.icon}</span><span><strong>{a.name}</strong><small>{p.qualified ? "✓ Sbloccato" : a.id === "attack" ? `${p.progress}/3 bit Attacco${p.evidence.stageSlug ? " nella tappa vinta" : " · serve una vittoria"}` : `${p.progress} / ${p.target}`}</small><small className="beycoin-reward">+{p.coinReward} BC</small></span></button>; })}</div>
          <section className="achievement-detail" aria-live="polite"><p className="section-kicker">{definition.category} / {progress?.qualified ? "SBLOCCATO" : "DA CONQUISTARE"}</p><h3>{definition.name}</h3><p>{definition.rule}</p>
            {progress?.evidence.stageName && <p>Tappa: <strong>{progress.evidence.stageName}</strong>{progress.evidence.eventDate && ` · ${progress.evidence.eventDate}`}</p>}
            {progress?.evidence.season && <p>Stagione {progress.evidence.season} · {progress.progress} / {progress.target}</p>}
            {selected === "attack" && <p className="achievement-help">Conta soltanto il tipo dei tre bit, non quello delle lame. Bit “aggiungi altro” sconosciuti: non classificati. Nessuna approvazione staff richiesta.{progress?.evidence.bits?.length ? ` Bit dichiarati: ${progress.evidence.bits.join(" · ")}.` : ""}</p>}
            <p className="achievement-reward">RICOMPENSA · {progress?.coinReward ?? BEYCOIN_REWARDS[definition.id]} Beycoin + {definition.reward}</p>{progress?.earnedAt && <small>Riconosciuto il {new Date(progress.earnedAt).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" })}</small>}
          </section>
        </section>
        <form className="achievement-showcase" onSubmit={saveProfile}><p className="section-kicker">LA TUA VETRINA</p><h2>Le imprese che ti rappresentano</h2><p>Scegli fino a tre distintivi da rendere visibili agli altri membri. L’album completo e il progresso restano personali.</p><fieldset disabled={busy}><legend>DISTINTIVI IN MOSTRA · {showcase.length} / 3</legend><div className="achievement-showcase-options">{unlocked.map(a => { const d = achievementDefinition(a.id)!; return <label key={a.id}><input type="checkbox" checked={showcase.includes(a.id)} disabled={!showcase.includes(a.id) && showcase.length >= 3} onChange={event => setShowcase(current => event.target.checked ? [...current, a.id] : current.filter(id => id !== a.id))} /><span aria-hidden="true">{d.icon}</span>{d.name}</label>; })}</div></fieldset>
          <label className="achievement-title-choice">TITOLO VISIBILE<select disabled={busy} value={titleId} onChange={event => setTitleId(event.target.value as AchievementId | "")}><option value="">Nessuno</option>{unlocked.filter(a => achievementTitle(a.id)).map(a => <option key={a.id} value={a.id}>{achievementTitle(a.id)}</option>)}</select></label>
          <button className="solid-button" disabled={busy}>{busy ? "SALVO…" : "SALVA LA VETRINA →"}</button>{notice && <p role="status">{notice}</p>}
        </form>
        <p className="achievement-footnote">Lo storico disponibile viene riconosciuto automaticamente. Accesso e cambio avatar vengono registrati dall’introduzione di questa funzione. Una correzione ai risultati o al deck può aggiornare distintivi e ricompense.</p>
        <a className="outline-button" href="/gilda/mappa">VAI ALLO SPECCHIO NELLA GILDA ↗</a>
      </>}
      {error && <div role="alert"><p className="form-error">{error}</p><button className="outline-button" disabled={busy} onClick={() => void load()}>RICARICA L’ALBUM</button></div>}
    </div>
  </main>;
}
