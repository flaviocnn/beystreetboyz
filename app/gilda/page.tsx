"use client";

import { useEffect, useState } from "react";

type Member = { id: string; firstName: string; lastName: string; email: string };

export default function GuildEntrance() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch("/api/member/session", { cache: "no-store" }).then((response) => response.json()).then((result) => setMember(result.member)).catch(() => setError("Impossibile verificare l'accesso")).finally(() => setLoading(false));
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/member/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Accesso non riuscito");
      setMember(result.member);
      setPassword("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Accesso non riuscito"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/member/session", { method: "DELETE" });
    setMember(null);
  }

  return <main className="interior-shell guild-shell"><header className="interior-topbar"><a href="/" className="back-link">← TORNA ALLA MAPPA</a><span>TORINO QUEST / GILDA DEL GRIFONE</span></header><div className="interior-container guild-entrance"><div className="guild-emblem" aria-hidden="true">G</div><p className="section-kicker">UNA PORTA PER I MEMBRI</p><h1>La Gilda<br />del Grifone<span className="period">.</span></h1>{loading ? <p className="interior-muted">Controllo le credenziali…</p> : member ? <section className="auth-card"><p className="section-kicker">ACCESSO RICONOSCIUTO</p><h2>Bentornato, {member.firstName}.</h2><p>La Gilda ti aspetta. All'interno troverai la mappa e la classifica dei membri.</p><a className="solid-button" href="/gilda/mappa">ENTRA NELLA GILDA <span>→</span></a><button className="text-button" onClick={logout}>ESCI DAL TUO ACCOUNT</button></section> : <section className="auth-card"><p className="section-kicker">CREDENZIALI DELLA GILDA</p><h2>Mostra il tuo sigillo.</h2><p>Accedi con email e password consegnate dallo staff. Il browser ricorderà il tuo accesso.</p><form className="stack-form" onSubmit={login}><label>EMAIL<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required autoFocus /></label><label>PASSWORD<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label><button className="solid-button" disabled={busy}>ACCEDI ALLA GILDA <span>→</span></button></form>{error && <p className="form-error" role="alert">{error}</p>}</section>}</div></main>;
}
