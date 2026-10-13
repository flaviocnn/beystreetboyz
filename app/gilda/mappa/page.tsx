"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameAudio } from "../../lib/game-audio";
import { drawPixelPlayer, type Direction } from "../../lib/pixel-player";

type Member = { id: string; firstName: string; lastName: string; email: string };
type RankingRow = { id: string; firstName: string; lastName: string; score: number };

const WORLD = { width: 1450, height: 900 };
const BOARD = { x: 725, y: 390 };
const START = { x: 725, y: 650 };
const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up", w: "up", ArrowDown: "down", s: "down",
  ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right",
};

function drawGuildWorld(ctx: CanvasRenderingContext2D, near: boolean, now: number) {
  ctx.fillStyle = "#e6eadf";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  for (let y = 180; y < WORLD.height; y += 42) {
    for (let x = 0; x < WORLD.width; x += 42) {
      ctx.fillStyle = (Math.floor(x / 42) + Math.floor(y / 42)) % 2 === 0 ? "#dbe0d3" : "#eff0e8";
      ctx.fillRect(x, y, 41, 41);
      ctx.fillStyle = "#bcc9ba";
      ctx.fillRect(x + 3, y + 3, 3, 3);
    }
  }

  // The long runner makes the path to the board legible even while the camera moves.
  ctx.fillStyle = "#9dae98";
  ctx.fillRect(610, 252, 230, 648);
  ctx.fillStyle = "#526a56";
  ctx.fillRect(622, 252, 206, 648);
  ctx.fillStyle = "#8da48b";
  for (let y = 270; y < 880; y += 54) {
    ctx.fillRect(637, y, 17, 17);
    ctx.fillRect(796, y, 17, 17);
  }
  ctx.fillStyle = "#27332a";
  ctx.fillRect(0, 0, WORLD.width, 184);
  ctx.fillStyle = "#506b55";
  ctx.fillRect(0, 177, WORLD.width, 18);
  ctx.fillStyle = "#9eb299";
  ctx.fillRect(0, 195, WORLD.width, 8);

  // Banners and stone pillars frame the hall.
  for (const x of [285, 1165]) {
    ctx.fillStyle = "#25362c";
    ctx.fillRect(x - 30, 176, 60, 445);
    ctx.fillStyle = "#809b81";
    for (let y = 198; y < 610; y += 27) ctx.fillRect(x - 23, y, 46, 7);
    ctx.fillStyle = "#25362c";
    ctx.fillRect(x - 44, 605, 88, 23);
  }
  for (const x of [135, 1315]) {
    ctx.fillStyle = "#b8c5af";
    ctx.fillRect(x - 45, 30, 90, 138);
    ctx.fillStyle = "#25362c";
    ctx.fillRect(x - 36, 41, 72, 16);
    ctx.font = "bold 61px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("G", x, 130);
  }

  // Reading tables and lamps give the room a navigable, game-like silhouette.
  for (const x of [435, 1015]) {
    for (const y of [425, 710]) {
      ctx.fillStyle = "#27332a";
      ctx.fillRect(x - 69, y - 24, 138, 46);
      ctx.fillStyle = "#a4b4a0";
      ctx.fillRect(x - 59, y - 16, 118, 30);
      ctx.fillStyle = "#27332a";
      ctx.fillRect(x - 13, y + 22, 26, 18);
      ctx.fillRect(x - 13, y - 40, 26, 16);
      ctx.fillStyle = "#e8ecdf";
      ctx.fillRect(x - 26, y - 12, 20, 13);
      ctx.fillRect(x + 10, y - 12, 20, 13);
    }
  }

  // Heraldic crest above the leaderboard.
  ctx.fillStyle = "#a8b99e";
  ctx.fillRect(651, 22, 148, 139);
  ctx.strokeStyle = "#d8e3d2";
  ctx.lineWidth = 7;
  ctx.strokeRect(651, 22, 148, 139);
  ctx.fillStyle = "#27332a";
  ctx.font = "bold 99px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("G", 725, 128);

  const pulse = Math.sin(now / 260) * 5;
  ctx.fillStyle = near ? "#f5f6ec" : "#d7e0d1";
  ctx.fillRect(BOARD.x - 133, BOARD.y - 78, 266, 139);
  ctx.strokeStyle = "#202824";
  ctx.lineWidth = 8;
  ctx.strokeRect(BOARD.x - 133, BOARD.y - 78, 266, 139);
  ctx.fillStyle = "#202824";
  ctx.fillRect(BOARD.x - 116, BOARD.y - 62, 232, 27);
  ctx.fillStyle = "#f5f6ec";
  ctx.font = "bold 15px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("CLASSIFICA DELLA GILDA", BOARD.x, BOARD.y - 43);
  ctx.fillStyle = "#405e48";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(BOARD.x - 96, BOARD.y - 16 + i * 19, 18, 9);
    ctx.fillRect(BOARD.x - 67, BOARD.y - 16 + i * 19, 135 - i * 22, 9);
  }
  ctx.fillStyle = "#202824";
  ctx.fillRect(BOARD.x - 18, BOARD.y - 126 + pulse, 36, 36);
  ctx.fillStyle = "#f5f6ec";
  ctx.font = "bold 22px ui-monospace, monospace";
  ctx.fillText(near ? "!" : "?", BOARD.x, BOARD.y - 100 + pulse);
  ctx.fillStyle = "#202824";
  ctx.font = "bold 13px ui-monospace, monospace";
  ctx.fillText("↑ BACHECA", START.x, 792);
}

function GuildRoom({ onBoard, onNear, onStep, paused }: {
  onBoard: () => void;
  onNear: (near: boolean) => void;
  onStep: () => void;
  paused: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ ...START, dir: "up" as Direction });
  const keysRef = useRef(new Set<Direction>());
  const nearRef = useRef(false);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) keysRef.current.clear();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(340, Math.floor(rect.height));
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = performance.now();
    let lastFootstep = 0;
    const render = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const player = playerRef.current;
      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (!pausedRef.current) {
        if (keys.has("left")) dx -= 1;
        if (keys.has("right")) dx += 1;
        if (keys.has("up")) dy -= 1;
        if (keys.has("down")) dy += 1;
      }
      if (dx && dy) { dx *= .707; dy *= .707; }
      const speed = .19 * dt;
      player.x = Math.max(36, Math.min(WORLD.width - 36, player.x + dx * speed));
      player.y = Math.max(240, Math.min(WORLD.height - 35, player.y + dy * speed));
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right";
      else if (dy) player.dir = dy < 0 ? "up" : "down";
      if ((dx || dy) && now - lastFootstep > 245) { onStep(); lastFootstep = now; }

      const near = Math.hypot(player.x - BOARD.x, player.y - BOARD.y) < 145;
      if (near !== nearRef.current) { nearRef.current = near; onNear(near); }
      const cameraX = Math.max(0, Math.min(WORLD.width - canvas.width, player.x - canvas.width / 2));
      const cameraY = Math.max(0, Math.min(WORLD.height - canvas.height, player.y - canvas.height * .62));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-Math.round(cameraX), -Math.round(cameraY));
      drawGuildWorld(ctx, near, now);
      drawPixelPlayer(ctx, player.x, player.y, player.dir, Boolean(dx || dy), now);
      ctx.restore();
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const keydown = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key];
      if (direction) {
        event.preventDefault();
        if (!pausedRef.current) keysRef.current.add(direction);
      }
      if (event.key === "Enter" && nearRef.current && !pausedRef.current) {
        event.preventDefault();
        onBoard();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[event.key];
      if (direction) keysRef.current.delete(direction);
    };
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
    };
  }, [onBoard, onNear, onStep]);

  return <>
    <canvas ref={canvasRef} className="guild-canvas" aria-label="Mappa interna della Gilda del Grifone. Avvicinati alla classifica con le frecce." />
    <div className="guild-dpad" aria-label="Controlli movimento">
      {(["up", "left", "down", "right"] as Direction[]).map((direction) => (
        <button key={direction} className={`guild-${direction}`} aria-label={`Vai ${direction}`}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); keysRef.current.add(direction); }}
          onPointerUp={() => keysRef.current.delete(direction)}
          onPointerCancel={() => keysRef.current.delete(direction)}>
          {direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}
        </button>
      ))}
    </div>
  </>;
}

export default function GuildMapPage() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [near, setNear] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [error, setError] = useState("");
  const { enabled: audioEnabled, toggle: toggleAudio, playClick, playStep } = useGameAudio();
  const openBoard = useCallback(() => { playClick(); setBoardOpen(true); }, [playClick]);
  const updateNear = useCallback((value: boolean) => setNear(value), []);
  const closeBoard = useCallback(() => { playClick(); setBoardOpen(false); }, [playClick]);

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
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossibile caricare la Gilda");
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!boardOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") closeBoard(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [boardOpen, closeBoard]);

  return <main className="guild-map-shell">
    <header className="guild-map-header">
      <a href="/gilda">← ATRIO DELLA GILDA</a>
      <span>LA GILDA DEL GRIFONE</span>
      <div className="guild-header-actions">
        <button className="guild-audio-toggle" onClick={toggleAudio} aria-pressed={audioEnabled} aria-label={audioEnabled ? "Disattiva audio" : "Attiva audio"}>
          <span aria-hidden="true">{audioEnabled ? "♫" : "×"}</span><span className="guild-audio-label">AUDIO {audioEnabled ? "ON" : "OFF"}</span>
        </button>
        <a href="/">MAPPA DI TORINO ↗</a>
      </div>
    </header>
    {loading ? <div className="guild-map-message">Apro la sala della Gilda…</div> : !member ? (
      <div className="guild-map-message"><h1>La porta è chiusa.</h1><p>Accedi con le tue credenziali per entrare.</p><a className="solid-button" href="/gilda">VAI ALL&apos;ACCESSO →</a></div>
    ) : <>
      <div className="guild-map-title">
        <p>BENVENUTO, {member.firstName.toUpperCase()}</p>
        <h1>Dentro la Gilda</h1>
        <span>FRECCE / WASD PER MUOVERTI · INVIO PER ESPLORARE</span>
      </div>
      <div className="guild-stage">
        <GuildRoom onBoard={openBoard} onNear={updateNear} onStep={playStep} paused={boardOpen} />
        <div className={`guild-interaction-prompt ${near && !boardOpen ? "is-visible" : ""}`} aria-live="polite">
          {near && !boardOpen && <button onClick={openBoard}><span className="prompt-icon">!</span><span><small>SEI VICINO ALLA</small>Classifica della Gilda</span><kbd>INVIO ↵</kbd></button>}
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {boardOpen && <div className="guild-overlay" onMouseDown={closeBoard}>
        <section className="ranking-card" role="dialog" aria-modal="true" aria-labelledby="ranking-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="close-button" onClick={closeBoard} aria-label="Chiudi">×</button>
          <p className="section-kicker">BACHECA DELLA GILDA</p>
          <h2 id="ranking-title">Classifica membri</h2>
          <p className="ranking-note">Il campionato deve ancora iniziare. Tutti i membri partono da 0 punti.</p>
          <div className="ranking-list">{ranking.map((row, index) => <div className={`ranking-row ${row.id === member.id ? "is-you" : ""}`} key={row.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.firstName} {row.lastName}{row.id === member.id ? " · TU" : ""}</strong><b>{row.score} PT</b></div>)}</div>
        </section>
      </div>}
    </>}
  </main>;
}
