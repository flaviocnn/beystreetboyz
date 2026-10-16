"use client";

import { useEffect, useState } from "react";
import "./local-member-switcher.css";

type Person = { id: string; firstName: string; lastName: string | null; challongeUsername: string | null; role: string };
type Data = { members: Person[]; impersonatingId: string | null; error?: string };
const name = (person: Person) => person.challongeUsername || [person.firstName, person.lastName].filter(Boolean).join(" ");

export default function LocalMemberSwitcher() {
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dev/impersonate", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 404) return;
      const result: Data = await response.json();
      if (!response.ok) throw new Error(result.error || "Modalità locale non disponibile");
      setData(result); setSelected(result.impersonatingId || result.members[0]?.id || "");
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, []);
  async function change(method: "POST" | "DELETE") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/dev/impersonate", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cambio membro non riuscito");
      // Reload all consumers of the member session, avatar and permissions.
      window.location.reload();
    } catch (error) { setError(error instanceof Error ? error.message : "Operazione non riuscita"); setBusy(false); }
  }
  if (!data && !error) return null;
  const current = data?.members.find(person => person.id === data.impersonatingId);
  const filtered = data?.members.filter(person => `${name(person)} ${person.firstName} ${person.lastName || ""}`.toLocaleLowerCase("it").includes(search.toLocaleLowerCase("it"))) || [];
  return <aside className="local-switcher" aria-label="Strumenti di prova locale" onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") setOpen(false); }} onKeyUp={event => event.stopPropagation()}>
    {open && <section id="local-member-panel" className="local-switcher-panel">
      <h2>Impersona un membro</h2>
      <p>Solo test locali. Le azioni si salvano nel PostgreSQL locale, mai in produzione.</p>
      {data && <form onSubmit={event => { event.preventDefault(); void change("POST"); }}>
        <label htmlFor="local-member-search">Cerca username o nome</label>
        <input id="local-member-search" type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={busy} />
        <label htmlFor="local-member-id">Membro da provare</label>
        <select id="local-member-id" value={filtered.some(person => person.id === selected) ? selected : ""} onChange={event => setSelected(event.target.value)} disabled={busy} required>
          <option value="" disabled>{filtered.length ? "Scegli un membro" : "Nessun membro trovato"}</option>
          {filtered.map(person => <option key={person.id} value={person.id}>{name(person)}{person.role === "staff" ? " · Staff" : " · Membro"}</option>)}
        </select>
        {data.members.length === 0 && <p>Il database locale è vuoto: importa prima una copia dei membri con la procedura di setup locale.</p>}
        <button type="submit" disabled={busy || !filtered.some(person => person.id === selected)}>{busy ? "Cambio in corso…" : "Entra come questo membro"}</button>
        {current && <button type="button" disabled={busy} onClick={() => void change("DELETE")}>Termina test · Torna visitatore</button>}
        <small>Usa i permessi reali del membro, senza password o login Challonge. Nessuna password viene modificata. La sessione di test dura un’ora.</small>
      </form>}
      {error && <p role="alert">{error}</p>}
    </section>}
    <button className="local-switcher-toggle" aria-expanded={open} aria-controls="local-member-panel" onClick={() => setOpen(value => !value)}>TEST LOCALE{current ? ` · ${name(current)}` : " · Cambia membro"}</button>
  </aside>;
}
