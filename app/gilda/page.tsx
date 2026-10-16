"use client";
import { invalidateGameData, getGameSession } from "../lib/game-data";
import { memberDisplayName } from "../lib/member-name";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readResponse, type PlayerMember } from "../lib/client-api";

export default function GuildEntrance() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<PlayerMember | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let oauthMessage = "";
    const oauthError = new URLSearchParams(window.location.search).get("challonge_error");
    if (oauthError) {
      const messages: Record<string, string> = {
        not_configured: "L’accesso con Challonge sarà disponibile appena lo staff avrà completato l’attivazione. Puoi usare email o codice fiscale.",
        expired: "La richiesta di accesso è scaduta o è già stata utilizzata. Riprova con Challonge.",
        cancelled: "Accesso con Challonge annullato. Puoi riprovare quando vuoi.",
        account_conflict: "Il profilo Challonge è associato a dati non coerenti. Contatta lo staff per verificare il collegamento.",
        unavailable: "Non è stato possibile completare l’accesso con Challonge. Riprova tra poco.",
      };
      oauthMessage = messages[oauthError] || messages.unavailable;
      window.history.replaceState(null, "", "/gilda");
    }
    void getGameSession().then((result) => { setMember(result.member); if (oauthMessage) setError(oauthMessage); }).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const changing = member && (member.mustChangePassword || changeOpen);
      if (changing && newPassword !== confirmation) throw new Error("Le nuove password non coincidono");
      const result = await readResponse(await fetch(changing ? "/api/member/password" : "/api/member/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changing ? { currentPassword: password, password: newPassword } : { identifier, password }) }));
      invalidateGameData(); window.dispatchEvent(new Event("torino-achievements-changed"));
      setMember(result.member); setPassword(""); setNewPassword(""); setConfirmation(""); setChangeOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Accesso non riuscito"); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await readResponse(await fetch("/api/member/session", { method: "DELETE" })); invalidateGameData(); window.dispatchEvent(new Event("torino-achievements-changed")); setMember(null); setChangeOpen(false); setPassword(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Riprova"); }
    finally { setBusy(false); }
  }
  const changing = !!member && (member.mustChangePassword || changeOpen);
  return <main className="interior-shell guild-shell"><header className="interior-topbar"><Link href="/" className="back-link">← TORNA ALLA MAPPA</Link><span>GILDA DEL GRIFONE</span></header><div className="interior-container guild-entrance"><div className="guild-emblem" aria-hidden="true">G</div><p className="section-kicker">UNA PORTA PER I MEMBRI</p><h1>La Gilda<br />del Grifone<span className="period">.</span></h1>{loading ? <p>Controllo le credenziali…</p> : <section className="auth-card">
    {member && !changing ? <><p className="section-kicker">ACCESSO RICONOSCIUTO</p><h2>Bentornato, {memberDisplayName(member)}.</h2><p>La Gilda ti aspetta. Visita il Wistery per scegliere il tuo avatar.</p><Link className="solid-button" href="/gilda/mappa">ENTRA NELLA GILDA →</Link><Link className="outline-button" href="/wistery">PERSONALIZZA AL WISTERY ↗</Link><button className="text-button" onClick={() => { setChangeOpen(true); setError(""); }}>CAMBIA PASSWORD</button></> : <>
      <p className="section-kicker">{changing ? "IL TUO SIGILLO PERSONALE" : "CREDENZIALI DELLA GILDA"}</p><h2>{changing ? "Scegli una nuova password." : "Mostra il tuo sigillo."}</h2><p>{changing ? "Prima di proseguire, sostituisci la password temporanea con una personale di almeno 10 caratteri." : "Entra con email oppure codice fiscale e password. Il browser ricorderà il tuo accesso."}</p>
      {!changing && <div className="challonge-login"><a className="solid-button" href="/api/auth/challonge">ACCEDI CON CHALLONGE →</a><p>Ritrova il tuo membro della Gilda con il profilo Challonge. Se sei nuovo, creeremo il tuo profilo da completare con lo staff.</p><p className="section-kicker">OPPURE USA LE CREDENZIALI DELLA GILDA</p></div>}
      <form className="stack-form" onSubmit={submit}>
        {!changing && <label>EMAIL O CODICE FISCALE<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required /></label>}
        <label>{changing ? "PASSWORD ATTUALE / TEMPORANEA" : "PASSWORD"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" maxLength={200} required /></label>
        {changing && <><label>NUOVA PASSWORD<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required /></label><label>RIPETI LA NUOVA PASSWORD<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required /></label></>}
        <button className="solid-button" disabled={busy}>{busy ? "ATTENDI…" : changing ? "SALVA LA NUOVA PASSWORD →" : "ACCEDI ALLA GILDA →"}</button>
        {changing && !member?.mustChangePassword && <button type="button" className="text-button" onClick={() => setChangeOpen(false)}>ANNULLA</button>}
      </form></>}
    {error && <p className="form-error" role="alert">{error}</p>}{member && <button className="text-button" disabled={busy} onClick={logout}>ESCI DAL TUO ACCOUNT</button>}
    </section>}</div></main>;
}
