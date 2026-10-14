"use client";

import { useCallback, useEffect, useState } from "react";
import { readResponse, type PlayerMember } from "../../lib/client-api";

type Message = {
  id: string; memberId: string; body: string; createdAt: string;
  firstName: string; lastName: string;
};
type RankingRow = { id: string; firstName: string; lastName: string; score: number };

export default function GuildBoard({ member, ranking, rankingError, onClick }: {
  member: PlayerMember; ranking: RankingRow[]; rankingError: string; onClick: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [postedToday, setPostedToday] = useState(false);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const result = await readResponse(await fetch("/api/guild/messages", { cache: "no-store" }));
    setMessages(result.messages);
    setPostedToday(result.postedToday);
  }, []);
  useEffect(() => {
    void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Impossibile caricare la bacheca"))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (busy || postedToday || !draft.trim()) return;
    setBusy(true); setError(""); onClick();
    try {
      await readResponse(await fetch("/api/guild/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      }));
      setDraft(""); setPostedToday(true);
      await refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Pubblicazione non riuscita";
      setError(message);
      if (message.includes("già scritto")) setPostedToday(true);
    } finally { setBusy(false); }
  }

  return <div className="guild-board">
    <section className="guild-board-write" aria-labelledby="guild-board-write-title">
      <div className="guild-board-heading"><span className="section-kicker">DIARIO DEI BLADER</span><h3 id="guild-board-write-title">Lascia il tuo segno.</h3><p>Un messaggio al giorno per ogni membro, secondo l’ora di Torino.</p></div>
      {loading ? <p role="status">Carico la bacheca…</p> : postedToday ?
        <p className="guild-board-done" role="status">Hai già scritto oggi. Torna domani per un nuovo messaggio.</p> :
        <form onSubmit={(event) => void publish(event)}>
          <label htmlFor="guild-board-message">IL TUO MESSAGGIO</label>
          <textarea id="guild-board-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} rows={4} placeholder="Una sfida, un saluto, un pensiero per la Gilda…" required />
          <div className="guild-board-submit"><small>{draft.length}/500 caratteri</small><button className="solid-button" disabled={busy || !draft.trim()}>{busy ? "PUBBLICAZIONE…" : "PUBBLICA SULLA BACHECA →"}</button></div>
        </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
    <section className="guild-board-feed" aria-labelledby="guild-board-feed-title">
      <div className="guild-board-feed-title"><h3 id="guild-board-feed-title">Messaggi recenti</h3><span>{messages.length} / 50</span></div>
      {!loading && messages.length === 0 ? <p className="guild-board-empty">La bacheca è ancora vuota. Il primo messaggio può essere il tuo.</p> :
        <div className="guild-board-messages">{messages.map((message) => <article key={message.id} className={message.memberId === member.id ? "is-you" : ""}>
          <header><strong>{message.firstName} {message.lastName}{message.memberId === member.id ? " · TU" : ""}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time></header>
          <p>{message.body}</p>
        </article>)}</div>}
    </section>
    <section className="guild-board-ranking" aria-labelledby="guild-board-ranking-title">
      <h3 id="guild-board-ranking-title">Classifica della Gilda</h3>
      <p className="ranking-note">Le prestazioni dei membri, tappa dopo tappa.</p>
      {rankingError ? <p className="form-error" role="alert">{rankingError}</p> : <div className="ranking-list">{ranking.map((row, index) => <div className={`ranking-row ${row.id === member.id ? "is-you" : ""}`} key={row.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.firstName} {row.lastName}{row.id === member.id ? " · TU" : ""}</strong><b>{row.score} PT</b></div>)}</div>}
    </section>
  </div>;
}
