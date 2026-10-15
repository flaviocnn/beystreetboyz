"use client";
import Link from "next/link";
import { memberDisplayName } from "../lib/member-name";

import { useCallback, useEffect, useState } from "react";

import type { MemberInput } from "../lib/members";
type Member = MemberInput & { id: string; score: number; mustChangePassword: boolean };
type Form = Omit<MemberInput, "feeCents"> & { fee: string };
const emptyForm: Form = { firstName: "", lastName: "", fiscalCode: "", documentNumber: "", email: "", phone: "", challongeUsername: "", challongeId: "", membershipStatus: "unknown", paymentMethod: "", paymentPaid: null, fee: "" };
const paymentLabels: Record<string, string> = { cash: "Contanti", bank: "Bonifico", card: "Carta", other: "Altro" };

async function jsonResponse(response: Response) {
  const result = await response.json().catch(() => null) as Record<string, any> | null;
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
  const [search, setSearch] = useState("");
  const visibleMembers = members.filter((m) => `${m.challongeUsername ?? ""} ${m.firstName} ${m.lastName ?? ""} ${m.fiscalCode ?? ""} ${m.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));

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
      const result = await jsonResponse(await fetch(editingId ? `/api/staff/members/${editingId}` : "/api/staff/members", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, feeCents: form.fee === "" ? null : Math.round(Number(form.fee) * 100) }) }));
      if (result.password) setIssuedPassword({ name: memberDisplayName(result.member), email: result.member.email || result.member.fiscalCode || "", password: result.password });
      setForm(emptyForm);
      setEditingId(null);
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
    } finally { setBusy(false); }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Eliminare ${memberDisplayName(member)} ${member.lastName}? Il suo accesso alla Gilda verrà revocato.`)) return;
    setBusy(true);
    setError("");
    try {
      await jsonResponse(await fetch(`/api/staff/members/${member.id}`, { method: "DELETE" }));
      if (editingId === member.id) { setEditingId(null); setForm(emptyForm); }
      await loadMembers();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita"); }
    finally { setBusy(false); }
  }

  async function resetPassword(member: Member) {
    if (!window.confirm(`Reimpostare la password di ${memberDisplayName(member)} ${member.lastName}? Le sue sessioni attive verranno chiuse.`)) return;
    setBusy(true);
    setError("");
    setIssuedPassword(null);
    try {
      const result = await jsonResponse(await fetch(`/api/staff/members/${member.id}/reset-password`, { method: "POST" }));
      setIssuedPassword({ name: `${memberDisplayName(member)} ${member.lastName}`, email: member.email || member.fiscalCode || "", password: result.password });
      await loadMembers();
      document.querySelector(".credential-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Reset password non riuscito"); }
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
              <Link className="solid-button checkin-staff-link" href="/staff/checkin"><span>CHECK-IN TAPPE</span>Iscritti, presenze e pagamenti →</Link>
              <div className="staff-heading"><div><p className="section-kicker">ARCHIVIO MEMBRI</p><h2>{members.length} {members.length === 1 ? "membro" : "membri"} registrati</h2></div><button className="text-button" onClick={logout}>ESCI ↗</button></div>
              {issuedPassword && <div className="credential-card" role="status"><button className="credential-close" onClick={() => setIssuedPassword(null)} aria-label="Chiudi credenziali">×</button><strong>Password temporanea per {issuedPassword.name}</strong><p>Consegna identificativo e password al membro. Dovrà cambiarla al prossimo accesso. Copiala prima di chiudere questo riquadro.</p><div><span>{issuedPassword.email}</span><code>{issuedPassword.password}</code></div><button className="text-button" onClick={() => void navigator.clipboard.writeText(`${issuedPassword.email}\n${issuedPassword.password}`).catch(() => setError("Copia manualmente le credenziali dal riquadro."))}>COPIA CREDENZIALI ↗</button></div>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <label className="member-search">CERCA MEMBRO<input type="search" placeholder="Nome, cognome, CF o email" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
              <a className="outline-button mobile-add-member" href="#member-form" onClick={() => { setEditingId(null); setForm(emptyForm); }}>+ AGGIUNGI MEMBRO</a>
              <div className="member-list">{visibleMembers.length === 0 ? <div className="empty-list">Nessun membro trovato.</div> : visibleMembers.map((member, index) => <article className="member-row" key={member.id}><span className="member-number">{String(index + 1).padStart(2, "0")}</span><div className="member-info"><strong>{memberDisplayName(member)}</strong><small>{member.firstName} {member.lastName}</small><small>{member.email || "Email non indicata"} · {member.phone || "Telefono non indicato"}</small><span>CF {member.fiscalCode || "Da indicare"}<br />DOC {member.documentNumber || "Da indicare"}</span><span>Challonge: {member.challongeUsername || "da associare"}{member.challongeId ? ` · ID ${member.challongeId}` : ""}</span><span className="member-badges"><b>{member.membershipStatus === "registered" ? "TESSERATO" : member.membershipStatus === "pending" ? "DA TESSERARE" : "TESSERAMENTO DA VERIFICARE"}</b><b className={member.paymentPaid === true ? "paid" : "unpaid"}>{member.paymentPaid === true ? "PAGATO" : member.paymentPaid === false ? "NON PAGATO" : "PAGAMENTO DA VERIFICARE"}</b></span><span>{member.feeCents !== null ? `${(member.feeCents / 100).toFixed(2)} €` : "Importo da definire"}{member.paymentMethod ? ` · ${paymentLabels[member.paymentMethod]}` : " · Metodo da indicare"}</span></div><div className="member-actions"><button onClick={() => { setEditingId(member.id); setForm({ ...member, fee: member.feeCents === null ? "" : String(member.feeCents / 100) }); setIssuedPassword(null); document.getElementById("member-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} disabled={busy}>MODIFICA</button><button onClick={() => void resetPassword(member)} disabled={busy}>RESET PASSWORD</button><button className="danger" onClick={() => void remove(member)} disabled={busy}>ELIMINA</button></div></article>)}</div>
            </div>
            <aside className="member-form-card" id="member-form"><p className="section-kicker">{editingId ? "MODIFICA SCHEDA" : "NUOVA ISCRIZIONE"}</p><h2>{editingId ? "Modifica membro" : "Aggiungi membro"}</h2><p>{editingId ? "Aggiorna anagrafica, profilo e tesseramento." : "Password temporanea generata al salvataggio, da cambiare al primo accesso. L’email è facoltativa."}</p><form className="stack-form" onSubmit={save}>
              {([ ["firstName", "NOME"], ["lastName", "COGNOME (FACOLTATIVO)"], ["fiscalCode", "CODICE FISCALE (OPPURE EMAIL)"], ["documentNumber", "NUMERO DOCUMENTO (FACOLTATIVO)"], ["phone", "TELEFONO"], ["email", "EMAIL (OPPURE CODICE FISCALE)"], ["challongeUsername", "USERNAME CHALLONGE"], ["challongeId", "ID CHALLONGE (FACOLTATIVO)"] ] as const).map(([key, label]) => <label key={key}>{label}<input type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={form[key] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} autoComplete="off" required={key === "firstName"} /></label>)}
              <p className="field-hint">Puoi censire il membro senza email o codice fiscale; servirà uno dei due per accedere alla Gilda.</p>
              <p className="field-hint">Associa l’account Challonge del giocatore. Risultati e punteggi saranno disponibili dopo la configurazione del campionato.</p>
              <fieldset className="membership-fields"><legend>TESSERAMENTO FISICO</legend>
                <label>STATO<select value={form.membershipStatus} onChange={(e) => setForm({ ...form, membershipStatus: e.target.value })}><option value="unknown">Da verificare</option><option value="pending">Da completare</option><option value="registered">Tesserato</option></select></label>
                <label>IMPORTO (€)<input type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="Da definire" /></label>
                <label>METODO DI PAGAMENTO<select value={form.paymentMethod || ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="">Da indicare</option><option value="cash">Contanti</option><option value="bank">Bonifico</option><option value="card">Carta</option><option value="other">Altro</option></select></label>
                <label>PAGAMENTO<select value={form.paymentPaid === null ? "unknown" : form.paymentPaid ? "paid" : "unpaid"} onChange={(e) => setForm({ ...form, paymentPaid: e.target.value === "unknown" ? null : e.target.value === "paid" })}><option value="unknown">Da verificare</option><option value="unpaid">Non pagato</option><option value="paid">Pagato</option></select></label>
              </fieldset>
              <button className="solid-button" disabled={busy}>{editingId ? "SALVA MODIFICHE" : "CREA MEMBRO"} <span>→</span></button>
              {editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>ANNULLA MODIFICA</button>}
            </form></aside>
          </div>
        )}
      </div>
    </main>
  );
}
