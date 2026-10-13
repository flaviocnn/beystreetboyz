"use client";

import { useCallback, useEffect, useState } from "react";

type Member = { id: string; firstName: string; lastName: string; fiscalCode: string; documentNumber: string; email: string; score: number };
type Form = Pick<Member, "firstName" | "lastName" | "fiscalCode" | "documentNumber" | "email">;
const emptyForm: Form = { firstName: "", lastName: "", fiscalCode: "", documentNumber: "", email: "" };

async function jsonResponse(response: Response) {
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "Il server non ha completato l'operazione. Riprova tra poco.");
  if (!result) throw new Error("Il server ha inviato una risposta non valida. Riprova tra poco.");
  return result;
}

export default function StaffPage() {
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [passphrase, setPassphrase] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<{ name: string; email: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMembers = useCallback(async () => {
    const result = await jsonResponse(await fetch("/api/staff/members", { cache: "no-store" }));
    setMembers(result.members);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const session = await jsonResponse(await fetch("/api/staff/session", { cache: "no-store" }));
        if (session.authenticated) {
          await loadMembers();
          setStatus("unlocked");
        } else setStatus("locked");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossibile caricare l'area staff");
        setStatus("locked");
      }
    })();
  }, [loadMembers]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await jsonResponse(await fetch("/api/staff/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase }) }));
      setPassphrase("");
      await loadMembers();
      setStatus("unlocked");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Accesso negato");
    } finally { setBusy(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await jsonResponse(await fetch(editingId ? `/api/staff/members/${editingId}` : "/api/staff/members", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }));
      if (result.password) setIssuedPassword({ name: `${result.member.firstName} ${result.member.lastName}`, email: result.member.email, password: result.password });
      setForm(emptyForm);
      setEditingId(null);
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
    } finally { setBusy(false); }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Eliminare ${member.firstName} ${member.lastName}? Il suo accesso alla Gilda verrà revocato.`)) return;
    setBusy(true);
    setError("");
    try {
      await jsonResponse(await fetch(`/api/staff/members/${member.id}`, { method: "DELETE" }));
      if (editingId === member.id) { setEditingId(null); setForm(emptyForm); }
      await loadMembers();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/staff/session", { method: "DELETE" });
    setStatus("locked");
    setMembers([]);
    setIssuedPassword(null);
  }

  return (
    <main className="interior-shell">
      <header className="interior-topbar"><a href="/" className="back-link">← TORNA ALLA MAPPA</a><span>TORINO QUEST / PALAZZO DELLO STAFF</span></header>
      <div className="interior-container">
        <p className="section-kicker">ACCESSO RISERVATO</p>
        <h1>Il palazzo<br />dello staff<span className="period">.</span></h1>
        {status === "loading" ? <p className="interior-muted">Apro l'archivio…</p> : status === "locked" ? (
          <section className="auth-card">
            <div className="card-icon">⌑</div>
            <h2>La porta è chiusa.</h2>
            <p>Inserisci la parola d'ordine per accedere all'archivio dei membri.</p>
            <form onSubmit={unlock} className="stack-form">
              <label>PAROLA D'ORDINE<input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password" required autoFocus /></label>
              <button className="solid-button" disabled={busy}>ENTRA NEL PALAZZO <span>→</span></button>
            </form>
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>
        ) : (
          <div className="staff-layout">
            <div className="staff-main">
              <div className="staff-heading"><div><p className="section-kicker">ARCHIVIO MEMBRI</p><h2>{members.length} {members.length === 1 ? "membro" : "membri"} registrati</h2></div><button className="text-button" onClick={logout}>ESCI ↗</button></div>
              {issuedPassword && <div className="credential-card" role="status"><button className="credential-close" onClick={() => setIssuedPassword(null)} aria-label="Chiudi credenziali">×</button><strong>Credenziali create per {issuedPassword.name}</strong><p>Consegna al membro email e password. La password compare solo ora: copiala prima di chiudere questo riquadro.</p><div><span>{issuedPassword.email}</span><code>{issuedPassword.password}</code></div><button className="text-button" onClick={() => void navigator.clipboard.writeText(`${issuedPassword.email}\n${issuedPassword.password}`)}>COPIA CREDENZIALI ↗</button></div>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="member-list">{members.length === 0 ? <div className="empty-list">Nessun membro ancora. Inizia dal modulo qui accanto.</div> : members.map((member, index) => <article className="member-row" key={member.id}><span className="member-number">{String(index + 1).padStart(2, "0")}</span><div className="member-info"><strong>{member.firstName} {member.lastName}</strong><small>{member.email}</small><span>CF {member.fiscalCode} · DOC {member.documentNumber}</span></div><div className="member-actions"><button onClick={() => { setEditingId(member.id); setForm({ firstName: member.firstName, lastName: member.lastName, fiscalCode: member.fiscalCode, documentNumber: member.documentNumber, email: member.email }); setIssuedPassword(null); }} disabled={busy}>MODIFICA</button><button className="danger" onClick={() => void remove(member)} disabled={busy}>ELIMINA</button></div></article>)}</div>
            </div>
            <aside className="member-form-card"><p className="section-kicker">{editingId ? "MODIFICA SCHEDA" : "NUOVA ISCRIZIONE"}</p><h2>{editingId ? "Modifica membro" : "Aggiungi membro"}</h2><p>{editingId ? "Aggiorna i dati. Le credenziali esistenti restano valide." : "La password buffa viene generata automaticamente al salvataggio."}</p><form className="stack-form" onSubmit={save}>
              {([ ["firstName", "NOME"], ["lastName", "COGNOME"], ["fiscalCode", "CODICE FISCALE"], ["documentNumber", "NUMERO DOCUMENTO"], ["email", "EMAIL"] ] as [keyof Form, string][]).map(([key, label]) => <label key={key}>{label}<input type={key === "email" ? "email" : "text"} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} autoComplete="off" required /></label>)}
              <button className="solid-button" disabled={busy}>{editingId ? "SALVA MODIFICHE" : "CREA MEMBRO"} <span>→</span></button>
              {editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>ANNULLA MODIFICA</button>}
            </form></aside>
          </div>
        )}
      </div>
    </main>
  );
}
