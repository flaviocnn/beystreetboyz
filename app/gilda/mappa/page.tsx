"use client";

import { useEffect, useRef, useState } from "react";

type Member = { id: string; firstName: string; lastName: string; email: string };
type RankingRow = { id: string; firstName: string; lastName: string; score: number };
type Direction = "up" | "down" | "left" | "right";

function GuildRoom({ onBoard, onNear }: { onBoard: () => void; onNear: (near: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef({ x: 0.5, y: 0.8 });
  const keys = useRef(new Set<Direction>());
  const nearRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const resize = () => { canvas.width = Math.max(300, Math.round(canvas.getBoundingClientRect().width)); canvas.height = Math.max(340, Math.round(canvas.getBoundingClientRect().height)); ctx.imageSmoothingEnabled = false; };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      const move = (direction: Direction, deltaX: number, deltaY: number) => { if (keys.current.has(direction)) { player.current.x += deltaX * dt; player.current.y += deltaY * dt; } };
      move("left", -0.00042, 0); move("right", 0.00042, 0); move("up", 0, -0.00062); move("down", 0, 0.00062);
      player.current.x = Math.min(.94, Math.max(.06, player.current.x));
      player.current.y = Math.min(.92, Math.max(.3, player.current.y));
      const w = canvas.width, h = canvas.height;
      const boardX = w * .5, boardY = h * .38;
      const px = player.current.x * w, py = player.current.y * h;
      const near = Math.hypot(px - boardX, py - boardY) < Math.min(w * .24, 165);
      if (near !== nearRef.current) { nearRef.current = near; onNear(near); }
      ctx.fillStyle = "#dddcd0"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#27302d"; ctx.fillRect(0, 0, w, h * .23);
      ctx.fillStyle = "#4e6258"; ctx.fillRect(0, h * .22, w, 16);
      ctx.fillStyle = "#c4cabd";
      for (let y = Math.round(h * .24); y < h; y += 30) for (let x = 0; x < w; x += 30) { ctx.fillRect(x + ((Math.floor(y / 30) % 2) * 15), y, 14, 4); }
      for (const x of [w * .14, w * .86]) {
        ctx.fillStyle = "#28302b"; ctx.fillRect(x - 16, h * .22, 32, h * .64);
        ctx.fillStyle = "#788b79"; for (let y = h * .25; y < h * .83; y += 24) ctx.fillRect(x - 10, y, 20, 5);
      }
      ctx.fillStyle = "#c0c8ae"; ctx.fillRect(w * .43, 16, w * .14, h * .16);
      ctx.fillStyle = "#27302d"; ctx.font = "bold 28px monospace"; ctx.textAlign = "center"; ctx.fillText("G", w * .5, h * .12);
      ctx.fillStyle = near ? "#f3f1e5" : "#d8dccf"; ctx.fillRect(boardX - 88, boardY - 48, 176, 93);
      ctx.strokeStyle = "#202824"; ctx.lineWidth = 6; ctx.strokeRect(boardX - 88, boardY - 48, 176, 93);
      ctx.fillStyle = "#202824"; ctx.font = "bold 14px monospace"; ctx.fillText("CLASSIFICA", boardX, boardY - 13);
      ctx.font = "bold 10px monospace"; ctx.fillText(near ? "PREMI INVIO" : "AVVICINATI", boardX, boardY + 18);
      ctx.fillStyle = "rgba(32,40,36,.2)"; ctx.fillRect(px - 13, py + 12, 26, 6);
      ctx.fillStyle = "#202824"; ctx.fillRect(px - 11, py - 13, 22, 19); ctx.fillRect(px - 10, py + 4, 20, 14); ctx.fillRect(px - 10, py + 18, 7, 7); ctx.fillRect(px + 3, py + 18, 7, 7);
      ctx.fillStyle = "#f3f1e5"; ctx.fillRect(px - 7, py - 8, 14, 9);
      ctx.fillStyle = "#202824"; ctx.fillRect(px - 4, py - 5, 3, 3); ctx.fillRect(px + 3, py - 5, 3, 3);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const map: Record<string, Direction> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
    const keydown = (event: KeyboardEvent) => { const dir = map[event.key]; if (dir) { event.preventDefault(); keys.current.add(dir); } if (event.key === "Enter" && nearRef.current) { event.preventDefault(); onBoard(); } };
    const keyup = (event: KeyboardEvent) => { const dir = map[event.key]; if (dir) keys.current.delete(dir); };
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup); window.addEventListener("blur", blur);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); window.removeEventListener("blur", blur); };
  }, [onBoard, onNear]);

  return <><canvas ref={canvasRef} className="guild-canvas" aria-label="Mappa interna della Gilda del Grifone. Muoviti verso la classifica." /><div className="guild-dpad">{(["up", "left", "down", "right"] as Direction[]).map((direction) => <button key={direction} className={`guild-${direction}`} aria-label={`Vai ${direction}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); keys.current.add(direction); }} onPointerUp={() => keys.current.delete(direction)} onPointerCancel={() => keys.current.delete(direction)}>{direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}</button>)}</div></>;
}

export default function GuildMapPage() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [near, setNear] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [error, setError] = useState("");
  const onBoard = () => setBoardOpen(true);
  const onNear = (value: boolean) => setNear(value);

  useEffect(() => {
    void (async () => {
      try {
        const sessionResponse = await fetch("/api/member/session", { cache: "no-store" });
        const session = await sessionResponse.json();
        if (!session.member) return;
        setMember(session.member);
        const rankingResponse = await fetch("/api/guild/ranking", { cache: "no-store" });
        const result = await rankingResponse.json();
        if (!rankingResponse.ok) throw new Error(result.error || "Classifica non disponibile");
        setRanking(result.ranking);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossibile caricare la Gilda"); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!boardOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setBoardOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [boardOpen]);

  return <main className="guild-map-shell"><header className="guild-map-header"><a href="/gilda">← ATRIO DELLA GILDA</a><span>LA GILDA DEL GRIFONE</span><a href="/">MAPPA DI TORINO ↗</a></header>{loading ? <div className="guild-map-message">Apro la sala della Gilda…</div> : !member ? <div className="guild-map-message"><h1>La porta è chiusa.</h1><p>Accedi con le tue credenziali per entrare.</p><a className="solid-button" href="/gilda">VAI ALL'ACCESSO →</a></div> : <><div className="guild-map-title"><p>BENVENUTO, {member.firstName.toUpperCase()}</p><h1>Dentro la Gilda</h1><span>Muoviti con le frecce. Avvicinati alla bacheca e premi Invio.</span></div><div className="guild-stage"><GuildRoom onBoard={onBoard} onNear={onNear} /><button className="guild-board-button" onClick={() => setBoardOpen(true)}>{near ? "↵ APRI LA CLASSIFICA" : "VEDI LA CLASSIFICA ↗"}</button></div>{error && <p className="form-error" role="alert">{error}</p>}{boardOpen && <div className="guild-overlay" onMouseDown={() => setBoardOpen(false)}><section className="ranking-card" role="dialog" aria-modal="true" aria-labelledby="ranking-title" onMouseDown={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setBoardOpen(false)} aria-label="Chiudi">×</button><p className="section-kicker">BACHECA DELLA GILDA</p><h2 id="ranking-title">Classifica membri</h2><p className="ranking-note">Il campionato deve ancora iniziare. Tutti i membri partono da 0 punti.</p><div className="ranking-list">{ranking.map((row, index) => <div className={`ranking-row ${row.id === member.id ? "is-you" : ""}`} key={row.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.firstName} {row.lastName}{row.id === member.id ? " · TU" : ""}</strong><b>{row.score} PT</b></div>)}</div></section></div>}</>}</main>;
}
