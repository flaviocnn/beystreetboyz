"use client";
import { useEffect, useId, useState } from "react";
import { attackBitCount, bitType, catalog, INTEGRATED_RATCHET, type Bey, type Deck, type DeckPart, type PersonalStage } from "../../lib/decks";
import { bladeOptions } from "../../lib/blade-options";

const emptyPart = (): DeckPart => ({ value: "", custom: false });
const emptyBey = (): Bey => ({ blades: [emptyPart()], ratchet: emptyPart(), bit: emptyPart() });
const emptyDeck = (): Deck => [emptyBey(), emptyBey(), emptyBey()];
type PartKind = "blade" | "ratchet" | "bit";
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "Operazione non completata. Riprova tra poco.");
  return data;
}
function PartPicker({ label, kind, part, disabled, onChange }: { label: string; kind: PartKind; part: DeckPart; disabled: boolean; onChange: (p: DeckPart) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const blades = bladeOptions(catalog.blades, query);
  const selectedOutsideFilter = kind === "blade" && !part.custom && part.value && !blades.some(blade => blade.value === part.value);
  return <div className="archive-part-picker"><label htmlFor={id}>{label}</label>
    {kind === "blade" && <label className="archive-part-search">Cerca per nome, categoria o sistema
      <input type="search" disabled={disabled} aria-label={`Cerca ${label.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Es. Wizard, Phoenix, CX…" />
    </label>}
    <select id={id} disabled={disabled} value={part.custom ? "__other" : part.value} onChange={e => onChange({ value: e.target.value === "__other" ? "" : e.target.value, custom: e.target.value === "__other" })} required>
    <option value="" disabled>Scegli {kind === "blade" ? "la lama" : kind === "bit" ? "il bit" : "il ratchet"}</option>
    {selectedOutsideFilter && <option hidden value={part.value}>{part.value} (selezionata)</option>}
    {kind === "blade" ? blades.map(blade => <option key={blade.value} value={blade.value}>{blade.value} · {blade.category}</option>)
      : kind === "bit" ? catalog.bits.map(p => <option key={p.value} value={p.value}>{p.label} · {bitType(p.value) ?? "Non classificato"}</option>)
        : <>{catalog.ratchets.map(p => <option key={p} value={p}>{p}</option>)}<option value={INTEGRATED_RATCHET}>{INTEGRATED_RATCHET}</option></>}
    <option value="__other">＋ Aggiungi altro…</option>
  </select>{kind === "blade" && <small role="status">{blades.length ? `${blades.length} opzioni in ordine alfabetico` : "Nessuna corrispondenza. Modifica la ricerca oppure scegli Aggiungi altro."}{selectedOutsideFilter ? ` · Selezione mantenuta: ${part.value}` : ""}</small>}
  {part.custom && <input disabled={disabled} aria-label={`${label}: nome del componente aggiunto`} required maxLength={100} value={part.value} onChange={e => onChange({ custom: true, value: e.target.value })} placeholder="Nome del componente" />}</div>;
}

export default function StageArchive({ onClick }: { onClick: () => void }) {
  const [stages, setStages] = useState<PersonalStage[]>([]), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<PersonalStage | null>(null), [deck, setDeck] = useState<Deck>(emptyDeck);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void request("/api/guild/stages", { signal: controller.signal }).then(data => setStages(data.stages)).catch(cause => {
      if (!controller.signal.aborted) setError(cause.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  function change(index: number, update: Partial<Bey>) {
    setDeck(current => current.map((bey, i) => i === index ? { ...bey, ...update } : bey) as Deck);
  }
  function edit(stage: PersonalStage) {
    onClick(); setError(""); setNotice(""); setDeck(stage.deck ? structuredClone(stage.deck) : emptyDeck()); setEditing(stage);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing || busy) return;
    setBusy(true); setError(""); setNotice(""); onClick();
    try {
      const data = await request(`/api/guild/stages/${encodeURIComponent(editing.slug)}/deck`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deck, version: editing.version }) });
      setStages(current => current.map(stage => stage.slug === editing.slug ? { ...stage, ...data } : stage));
      setEditing(null); setNotice("Deck salvato nel tuo archivio. Puoi modificarlo in seguito.");
      window.dispatchEvent(new Event("torino-achievements-changed"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito"); }
    finally { setBusy(false); }
  }
  return <div className="stage-archive">
    <p>Le tue tappe di campionato e i deck che hai portato in top 8. Lo storico si aggiorna quando lo staff importa i risultati da Challonge.</p>
    {loading && <p role="status">Sfoglio il tuo archivio…</p>}
    {notice && <p className="archive-notice" role="status">{notice}</p>}
    {!loading && !editing && <>
      {!stages.length && !error && <div className="archive-empty"><strong>La tua storia inizia qui.</strong><p>Non ci sono ancora risultati associati al tuo account. Il check-in da solo non aggiunge una tappa: occorre l’importazione dei risultati da parte dello staff.</p></div>}
      {stages.map(stage => <article key={stage.slug} className="archive-stage">
        <div className="archive-stage-header"><span className={stage.eligible ? "archive-rank is-top" : "archive-rank"}>{stage.finalRank !== null ? `#${stage.finalRank}` : "Fuori top 8"}</span><div><h3>{stage.name}</h3><time dateTime={stage.eventDate}>{new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeZone: "Europe/Rome" }).format(new Date(stage.eventDate + "T12:00:00Z"))}</time></div><strong>{stage.stagePoints} PT</strong></div>
        <p>Fase a gironi: {stage.swissWins} vittorie · {stage.swissLosses} sconfitte.{stage.finalRank === null && " Il piazzamento numerico fuori top 8 non è disponibile nei risultati salvati."}</p>
        {stage.deck && <ol className="archive-saved-deck">{stage.deck.map((bey, i) => <li key={i}><span>BEY {i + 1}</span><strong>{bey.blades.map(p => p.value).join(" · ")}</strong><small>{bey.ratchet.value} / {bey.bit.value}</small></li>)}</ol>}
        <div className="archive-actions">{stage.eligible ? <button className="solid-button" onClick={() => edit(stage)}>{stage.deck ? "MODIFICA IL DECK" : "REGISTRA IL DECK"} →</button> : <span className="archive-locked">Registrazione deck riservata alla top 8</span>}<a className="text-button" href={stage.sourceUrl} target="_blank" rel="noopener noreferrer">TORNEO CHALLONGE ↗</a></div>
        {stage.updatedAt && <small>Deck aggiornato il {new Date(stage.updatedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</small>}
      </article>)}
    </>}
    {editing && <form className="archive-editor stack-form" onSubmit={save}>
      <button type="button" className="text-button" disabled={busy} onClick={() => { onClick(); setEditing(null); setError(""); }}>← TORNA ALLE TAPPE</button>
      <h3>{editing.name} · #{editing.finalRank}</h3><p>Indica i tre beyblade usati in questa tappa. Per le lame CX puoi aggiungere più sottocomponenti. “Aggiungi altro” salva il nome nel tuo deck, senza modificare il catalogo comune.</p>
      {deck.map((bey, index) => <fieldset key={index} disabled={busy}><legend>BEYBLADE {index + 1} / 3</legend><div className="archive-parts">
        {bey.blades.map((blade, i) => <div className="archive-blade" key={i}><PartPicker disabled={busy} label={i === 0 ? "LAMA / COMPONENTE CX" : `COMPONENTE LAMA ${i + 1}`} kind="blade" part={blade} onChange={value => change(index, { blades: bey.blades.map((p, j) => i === j ? value : p) })} />{i > 0 && <button type="button" className="text-button" aria-label={`Rimuovi componente lama ${i + 1} del beyblade ${index + 1}`} onClick={() => change(index, { blades: bey.blades.filter((_, j) => i !== j) })}>RIMUOVI</button>}</div>)}
        {bey.blades.length < 5 && <button className="text-button" type="button" onClick={() => change(index, { blades: [...bey.blades, emptyPart()] })}>＋ COMPONENTE LAMA CX</button>}
        <PartPicker disabled={busy} label="RATCHET" kind="ratchet" part={bey.ratchet} onChange={ratchet => change(index, { ratchet })} />
        <PartPicker disabled={busy} label="BIT" kind="bit" part={bey.bit} onChange={bit => change(index, { bit })} />
      </div></fieldset>)}
      <p className="archive-hint" role="status">{attackBitCount(deck) === 3 ? "FULL ATTACCO · Tre bit Attacco. Se hai vinto questa tappa, sblocchi automaticamente Nessuna difesa." : `${attackBitCount(deck)} / 3 bit Attacco · Classificazione automatica dal catalogo Excel. I bit non classificati non contano come Attacco.`}</p>
      <button className="solid-button" disabled={busy}>{busy ? "SALVO…" : "SALVA IL DECK →"}</button>
      <p className="archive-hint">La registrazione documenta il deck dichiarato, non ne certifica la legalità o l’uso effettivo nel torneo.</p>
    </form>}
    {error && <div role="alert"><p className="form-error">{error}</p>{!editing && <button className="text-button" onClick={() => { setLoading(true); setError(""); void request("/api/guild/stages").then(data => setStages(data.stages)).catch(cause => setError(cause.message)).finally(() => setLoading(false)); }}>RIPROVA</button>}</div>}
  </div>;
}
