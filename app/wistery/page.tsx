"use client";
import { useEffect, useRef, useState } from "react";
import { AVATAR_COLORS, AVATAR_STYLES, drawPixelPlayer, type Direction } from "../lib/pixel-player";
import { readResponse, type PlayerMember } from "../lib/client-api";
import { useGameAudio } from "../lib/game-audio";

function Preview({ style, color, large = false, direction = "down" }: { style: number; color: number; large?: boolean; direction?: Direction }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(large ? 4 : 2, large ? 4 : 2);
      drawPixelPlayer(ctx, large ? 40 : 24, large ? 40 : 33, direction, large && !reduced, now, { avatarStyle: style, avatarColor: color });
      ctx.restore();
      if (large && !reduced) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [style, color, large, direction]);
  return <canvas ref={ref} width={large ? 320 : 96} height={large ? 300 : 124} aria-label={`${AVATAR_STYLES[style]}, ${AVATAR_COLORS[color].name}`} />;
}

export default function Wistery() {
  const [member, setMember] = useState<PlayerMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [style, setStyle] = useState(0), [color, setColor] = useState(0);
  const [direction, setDirection] = useState<Direction>("down");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  const { enabled, toggle, playClick } = useGameAudio("wistery");
  useEffect(() => {
    void fetch("/api/member/session", { cache: "no-store" }).then(readResponse).then(({ member: current }) => {
      setMember(current); if (current) { setStyle(current.avatarStyle); setColor(current.avatarColor); }
    }).catch((cause) => setError(cause.message)).finally(() => setLoading(false));
  }, []);
  async function save() {
    setBusy(true); setError(""); setSaved(false); playClick();
    try { const result = await readResponse(await fetch("/api/member/avatar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarStyle: style, avatarColor: color }) })); setMember(result.member); setSaved(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito"); }
    finally { setBusy(false); }
  }
  return <main className="interior-shell wistery-shell"><header className="interior-topbar"><a href="/">← MAPPA DI TORINO</a><span>WISTERY / COBALT FLAMES</span><button className="guild-audio-toggle" aria-pressed={enabled} aria-label={enabled ? "Disattiva audio" : "Attiva audio"} onClick={toggle}>♫ {enabled ? "ON" : "OFF"}</button></header><div className="interior-container">
    <p className="section-kicker">LA PATRIA DEI COBALT FLAMES</p><h1>Forgiato<br />nelle tenebre<span className="period">.</span></h1>
    {loading ? <p>Le porte si schiudono…</p> : !member || member.mustChangePassword ? <section className="auth-card"><h2>Il tuo sigillo è richiesto.</h2><p>{member ? "Modifica la password temporanea per entrare." : "Solo i membri della Gilda possono accedere all’atelier del Wistery."}</p><a className="solid-button" href="/gilda">VAI ALLA GILDA →</a></section> : <div className="avatar-workshop">
      <section className="avatar-preview-panel"><span className="section-kicker">IL TUO ALTER EGO</span><div className="avatar-stage"><Preview style={style} color={color} large direction={direction} /></div><h2>{AVATAR_STYLES[style]}</h2><p>{AVATAR_COLORS[color].name} · {member.firstName}</p><div className="avatar-directions" aria-label="Ruota anteprima">{(["left", "up", "down", "right"] as Direction[]).map((d) => <button key={d} aria-pressed={direction === d} aria-label={`Vista ${d}`} onClick={() => setDirection(d)}>{d === "left" ? "←" : d === "up" ? "↑" : d === "down" ? "↓" : "→"}</button>)}</div></section>
      <section className="avatar-options"><h2>01 / Scegli la tua forma</h2><div className="avatar-style-grid">{AVATAR_STYLES.map((name, i) => <button key={name} aria-pressed={style === i} onClick={() => { setStyle(i); setSaved(false); playClick(); }}><Preview style={i} color={color} /><span>{name}</span></button>)}</div><h2>02 / Accendi il tuo colore</h2><div className="avatar-colors">{AVATAR_COLORS.map((c, i) => <button key={c.name} style={{ "--swatch": c.hex } as React.CSSProperties} aria-label={c.name} aria-pressed={color === i} onClick={() => { setColor(i); setSaved(false); playClick(); }}><span>{color === i ? "✓" : ""}</span><small>{c.name}</small></button>)}</div><p className="avatar-save-note">Il tuo avatar ti seguirà nella città e dentro la Gilda, anche quando accedi da un altro dispositivo.</p><button className="solid-button" onClick={save} disabled={busy}>{busy ? "SALVATAGGIO…" : "SALVA IL MIO AVATAR →"}</button>{saved && <p className="success-message" role="status">Avatar salvato. Il tuo nuovo volto ti aspetta sulla mappa.</p>}<a className="outline-button" href="/">TORNA ALLA CITTÀ ↗</a></section>
    </div>}{error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
