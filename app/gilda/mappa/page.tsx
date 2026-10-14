"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameAudio } from "../../lib/game-audio";
import { drawPixelPlayer, type Direction } from "../../lib/pixel-player";
import { type PlayerMember as Member, readResponse } from "../../lib/client-api";
import { useDialogFocus } from "../../lib/dialog-focus";
import { WORLD, START, PLACES, GAMES, canWalk, nearbyPlace, drawGuildWorld, drawRoomDetails, drawMinimap, drawChampion, type PlaceId } from "./guild-world";
import MirrorPhoto from "./mirror-photo";
import GuildBoard from "./guild-board";

type RankingRow = { id: string; firstName: string; lastName: string; score: number };
const KEY_DIRECTIONS: Record<string, Direction> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
const DIRECTION_NAMES = { up: "su", down: "giù", left: "a sinistra", right: "a destra" };
function beginWalk(keys: Set<Direction>, player: { x: number; y: number; dir: Direction }, direction: Direction) {
  // Make short taps move too, even when released before the next animation frame.
  if (!keys.has(direction)) {
    const x = player.x + (direction === "left" ? -8 : direction === "right" ? 8 : 0);
    const y = player.y + (direction === "up" ? -8 : direction === "down" ? 8 : 0);
    if (canWalk(x, y)) { player.x = x; player.y = y; }
    player.dir = direction;
  }
  keys.add(direction);
}

function GuildRoom({ onOpen, onNear, onStep, paused, member }: {
  member: Member; onOpen: (id: PlaceId) => void; onNear: (id: PlaceId | null) => void; onStep: () => void; paused: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({ ...START, dir: "up" as Direction });
  const keysRef = useRef(new Set<Direction>());
  const nearRef = useRef<PlaceId | null>(null), pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; if (paused) keysRef.current.clear(); }, [paused]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const background = document.createElement("canvas"); background.width = WORLD.width; background.height = WORLD.height;
    const backgroundContext = background.getContext("2d");
    if (!backgroundContext) return;
    drawGuildWorld(backgroundContext);
    const resize = () => { const rect = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.floor(rect.width)); canvas.height = Math.max(1, Math.floor(rect.height)); ctx.imageSmoothingEnabled = false; };
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas);
    let frame = 0, last = performance.now(), lastFootstep = 0;
    const render = (now: number) => {
      const dt = Math.min(32, now - last); last = now;
      const player = playerRef.current, keys = keysRef.current;
      let dx = 0, dy = 0;
      if (!pausedRef.current) { if (keys.has("left")) dx--; if (keys.has("right")) dx++; if (keys.has("up")) dy--; if (keys.has("down")) dy++; }
      if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
      const beforeX = player.x, beforeY = player.y, speed = .19 * dt;
      if (canWalk(player.x + dx * speed, player.y)) player.x += dx * speed;
      if (canWalk(player.x, player.y + dy * speed)) player.y += dy * speed;
      const walking = beforeX !== player.x || beforeY !== player.y;
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right"; else if (dy) player.dir = dy < 0 ? "up" : "down";
      if (walking && now - lastFootstep > 245) { onStep(); lastFootstep = now; }
      const near = nearbyPlace(player.x, player.y);
      if (near !== nearRef.current) { nearRef.current = near; onNear(near); }
      const cameraX = canvas.width > WORLD.width ? (WORLD.width - canvas.width) / 2 : Math.max(0, Math.min(WORLD.width - canvas.width, player.x - canvas.width / 2));
      const cameraY = Math.max(0, Math.min(WORLD.height - canvas.height, player.y - canvas.height * .58));
      ctx.fillStyle = "#dbe0d3"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.translate(-Math.round(cameraX), -Math.round(cameraY)); ctx.drawImage(background, 0, 0);
      drawRoomDetails(ctx, near, now, member); drawPixelPlayer(ctx, player.x, player.y, player.dir, walking, now, member); ctx.restore();
      drawMinimap(ctx, player.x, player.y);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const keydown = (event: KeyboardEvent) => {
      if (pausedRef.current || (event.target instanceof Element && event.target.closest("input, textarea, select"))) return;
      const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.key.toLowerCase()];
      if (direction) { event.preventDefault(); beginWalk(keysRef.current, playerRef.current, direction); }
      if (event.key === "Enter" && nearRef.current && !event.repeat) { event.preventDefault(); onOpen(nearRef.current); }
    };
    const keyup = (event: KeyboardEvent) => { const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.key.toLowerCase()]; if (direction) keysRef.current.delete(direction); };
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", blur);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", blur); };
  }, [onOpen, onNear, onStep, member]);
  return <>
    <canvas ref={canvasRef} className="guild-canvas" aria-label="Mappa della Gilda: bacheca a nord, classifica a est, specchio a nord-ovest, statua del campione a nord-est e libreria a sud-ovest. Muoviti con le frecce o i pulsanti touch e interagisci vicino agli oggetti." />
    <div className="guild-map-legend" aria-label="Legenda mappa"><span>S · Specchio</span><span>C · Campione</span><span>L · Libreria</span><span>B · Bacheca</span><span>R · Classifica</span></div>
    <div className="guild-dpad" aria-label="Controlli movimento">{(["up", "left", "down", "right"] as Direction[]).map((direction) => <button key={direction} className={`guild-${direction}`} aria-label={`Vai ${DIRECTION_NAMES[direction]}`} disabled={paused}
      onPointerDown={(event) => { if (!pausedRef.current) { event.currentTarget.setPointerCapture(event.pointerId); beginWalk(keysRef.current, playerRef.current, direction); } }}
      onPointerUp={() => keysRef.current.delete(direction)} onPointerCancel={() => keysRef.current.delete(direction)} onLostPointerCapture={() => keysRef.current.delete(direction)}>
      {direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}</button>)}</div>
  </>;
}
function ChampionPortrait() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) { ctx.clearRect(0, 0, 360, 350); ctx.imageSmoothingEnabled = false; drawChampion(ctx, 180, 220, 2); } }, []);
  return <canvas ref={ref} width={360} height={350} aria-label="Statua pixel art di GranBurstone con corona, trofeo e lanciatore" />;
}
function Library({ onClick }: { onClick: () => void }) {
  const [selected, setSelected] = useState(0);
  const game = GAMES[selected];
  return <><p className="guild-object-description">Scatole consumate, dadi fortunati e ancora un’ultima partita. Sfoglia la ludoteca virtuale della Gilda.</p>
    <div className="library-shelves" aria-label="Giochi sugli scaffali">{GAMES.map((g, i) => <button key={g.title} style={{ "--box-color": g.color } as React.CSSProperties} aria-pressed={i === selected} onClick={() => { setSelected(i); onClick(); }}><span className="game-box-symbol" aria-hidden="true">{["♟", "◉", "▦", "•••", "◆", "◐", "↗", "✦"][i]}</span><strong>{g.title}</strong><small>{g.kind}</small></button>)}</div>
    <div className="library-game-detail" aria-live="polite"><span className="section-kicker">SCATOLA {String(selected + 1).padStart(2, "0")} / 08</span><h3>{game.title}</h3><p>{game.text}</p><span className="library-note">Da scoprire sullo scaffale · Le partite non sono giocabili nell’app.</span></div>
  </>;
}

export default function GuildMapPage() {
  const [loading, setLoading] = useState(true), [member, setMember] = useState<Member | null>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]), [error, setError] = useState("");
  const [near, setNear] = useState<PlaceId | null>(null), [opened, setOpened] = useState<PlaceId | null>(null);
  useDialogFocus(!!opened);
  const { enabled: audioEnabled, toggle: toggleAudio, playClick, playStep } = useGameAudio("guild");
  const open = useCallback((id: PlaceId) => { playClick(); setOpened(id); }, [playClick]);
  const close = useCallback(() => { playClick(); setOpened(null); }, [playClick]);
  const updateNear = useCallback((id: PlaceId | null) => setNear(id), []);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const session = await readResponse(await fetch("/api/member/session", { cache: "no-store" }));
        if (!live || !session.member) return;
        if (session.member.mustChangePassword) { window.location.replace("/gilda"); return; }
        setMember(session.member);
        const result = await readResponse(await fetch("/api/guild/ranking", { cache: "no-store" }));
        if (live) setRanking(result.ranking);
      } catch (cause) { if (live) setError(cause instanceof Error ? cause.message : "Impossibile caricare la Gilda"); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!opened) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [opened, close]);
  const nearby = PLACES.find((p) => p.id === near), selected = PLACES.find((p) => p.id === opened);
  return <main className="guild-map-shell">
    <header className="guild-map-header"><a href="/gilda">← ATRIO DELLA GILDA</a><span>LA GILDA DEL GRIFONE</span><div className="guild-header-actions"><button className="guild-audio-toggle" onClick={toggleAudio} aria-pressed={audioEnabled} aria-label={audioEnabled ? "Disattiva audio" : "Attiva audio"}><span aria-hidden="true">{audioEnabled ? "♫" : "×"}</span><span className="guild-audio-label">AUDIO {audioEnabled ? "ON" : "OFF"}</span></button><a href="/">MAPPA DI TORINO ↗</a></div></header>
    {loading ? <div className="guild-map-message">Apro la sala della Gilda…</div> : !member ? <div className="guild-map-message"><h1>La porta è chiusa.</h1><p>{error || "Accedi con le tue credenziali per entrare."}</p><a className="solid-button" href="/gilda">VAI ALL’ACCESSO →</a></div> : <>
      <div className="guild-map-title"><p>BENVENUTO, {member.firstName.toUpperCase()}</p><h1>Una Gilda da esplorare</h1><span>FRECCE / WASD · AVVICINATI E PREMI INVIO</span></div>
      <div className="guild-stage"><GuildRoom onOpen={open} onNear={updateNear} onStep={playStep} paused={!!opened} member={member} />
        <div className={`guild-interaction-prompt ${nearby && !opened ? "is-visible" : ""}`} aria-live="polite">{nearby && !opened && <button onClick={() => open(nearby.id)}><span className="prompt-icon">!</span><span><small>ESPLORA</small>{nearby.name}</span><kbd>INVIO ↵</kbd></button>}</div>
      </div>
      {opened && selected && <div className="guild-overlay" onMouseDown={close}><section className={`ranking-card guild-object-card guild-object-${opened}`} role="dialog" aria-modal="true" aria-labelledby="guild-object-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={close} aria-label="Chiudi">×</button>
        <p className="section-kicker">RANKED BEYSTREETBOYZ / {opened === "mirror" ? "IL TUO RITRATTO" : opened === "champion" ? "ALBO D’ORO" : opened === "library" ? "UN ALTRO TURNO" : opened === "ranking" ? "CLASSIFICA" : "BACHECA"}</p>
        <h2 id="guild-object-title">{selected.name}</h2>
        {opened === "mirror" && <MirrorPhoto member={member} onClick={playClick} />}
        {opened === "champion" && <div className="champion-memorial"><div className="champion-sprite"><ChampionPortrait /></div><p className="champion-year">CAMPIONE RANKED · 2025</p><h3>GranBurstone</h3><p>Al campione della ranked dell’anno scorso.<br />Il suo nome resta scolpito nella storia della Gilda.</p><blockquote>Un trofeo passa di mano.<br />Una leggenda resta.</blockquote></div>}
        {opened === "library" && <Library onClick={playClick} />}
        {opened === "board" && <GuildBoard member={member} onClick={playClick} />}
        {opened === "ranking" && <><p className="ranking-note">Le prestazioni dei membri, tappa dopo tappa.</p>{error ? <p className="form-error" role="alert">{error}</p> : <div className="ranking-list">{ranking.map((row, index) => <div className={`ranking-row ${row.id === member.id ? "is-you" : ""}`} key={row.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{row.firstName} {row.lastName}{row.id === member.id ? " · TU" : ""}</strong><b>{row.score} PT</b></div>)}</div>}</>}
      </section></div>}
    </>}
  </main>;
}
