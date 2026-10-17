"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Direction } from "../lib/pixel-player";
import { useGameAudio, usePopupSound } from "../lib/game-audio";
import { createJoystick, joystickKnob } from "../lib/joystick";
import { KEY_DIRECTIONS, drawWorldOverview } from "../lib/world-game";
import styles from "./world-polish.module.css";

const NAMES = { up: "su", down: "giù", left: "a sinistra", right: "a destra" };
export function WorldDpad({ paused, onDirection }: { paused: boolean; onDirection: (direction: Direction, active: boolean) => void }) {
  const [mode, setMode] = useState<"stick" | "arrows">("stick");
  useEffect(() => { try { if (localStorage.getItem("bsb-touch-controls") === "arrows") queueMicrotask(() => setMode("arrows")); } catch {} }, []);
  return <div className="world-touch-controls" aria-label="Controlli movimento">
    {mode === "stick" ? <WorldJoystick paused={paused} onDirection={onDirection} /> : <WorldArrowPad paused={paused} onDirection={onDirection} />}
    <button className="world-control-switch" disabled={paused} onClick={() => { const next = mode === "stick" ? "arrows" : "stick"; setMode(next); try { localStorage.setItem("bsb-touch-controls", next); } catch {} }}>
      {mode === "stick" ? "Usa le frecce" : "Usa il joystick"}
    </button>
  </div>;
}
function WorldJoystick({ paused, onDirection }: { paused: boolean; onDirection: (direction: Direction, active: boolean) => void }) {
  const callback = useRef(onDirection), pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const controller = useRef<ReturnType<typeof createJoystick> | null>(null);
  useEffect(() => { callback.current = onDirection; }, [onDirection]);
  useEffect(() => {
    const stick = createJoystick((direction, active) => callback.current(direction, active)); controller.current = stick;
    const stop = () => { pointer.current = null; stick.stop(); setKnob({ x: 0, y: 0 }); };
    window.addEventListener("blur", stop); document.addEventListener("visibilitychange", stop);
    return () => { stick.stop(); controller.current = null; window.removeEventListener("blur", stop); document.removeEventListener("visibilitychange", stop); };
  }, []);
  useEffect(() => { if (paused) { pointer.current = null; controller.current?.stop(); queueMicrotask(() => setKnob({ x: 0, y: 0 })); } }, [paused]);
  function move(event: React.PointerEvent<HTMLButtonElement>) {
    if (paused || pointer.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
    controller.current?.move(x, y); setKnob(joystickKnob(x, y));
  }
  function stop(event: React.PointerEvent<HTMLButtonElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null; controller.current?.stop(); setKnob({ x: 0, y: 0 });
  }
  return <button className="world-joystick" disabled={paused} aria-label="Joystick di movimento: trascina per camminare" data-audio="quiet"
    onPointerDown={event => { if (paused || pointer.current !== null) return; event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
    onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onKeyDown={event => { const dir = KEY_DIRECTIONS[event.key]; if (dir && !paused) { event.preventDefault(); onDirection(dir, true); } }}
    onKeyUp={event => { const dir = KEY_DIRECTIONS[event.key]; if (dir) { event.preventDefault(); onDirection(dir, false); } }}
    onBlur={() => { pointer.current = null; controller.current?.stop(); setKnob({ x: 0, y: 0 }); for (const dir of ["up", "down", "left", "right"] as Direction[]) onDirection(dir, false); }}>
    <span className="world-joystick-ring" aria-hidden="true" />
    <span className="world-joystick-knob" aria-hidden="true" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
  </button>;
}
function WorldArrowPad({ paused, onDirection }: { paused: boolean; onDirection: (direction: Direction, active: boolean) => void }) {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const callback = useRef(onDirection);
  useEffect(() => { callback.current = onDirection; }, [onDirection]);
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); for (const dir of ["up", "down", "left", "right"] as Direction[]) callback.current(dir, false); }, []);
  return <div className="world-dpad" aria-label="Controlli movimento">{(["up", "left", "down", "right"] as Direction[]).map(direction => <button key={direction} className={`world-${direction}`} aria-label={`Vai ${NAMES[direction]}`} disabled={paused} data-audio="quiet"
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); onDirection(direction, true); }}
    onPointerUp={() => onDirection(direction, false)} onPointerCancel={() => onDirection(direction, false)} onLostPointerCapture={() => onDirection(direction, false)}
    onClick={event => { if (event.detail === 0) { onDirection(direction, true); const timer = setTimeout(() => { onDirection(direction, false); timers.current.delete(timer); }, 80); timers.current.add(timer); } }}>
    {direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "left" ? "←" : "→"}</button>)}</div>;
}
export function WorldHud({ title, area, paused = false, children }: { title: string; area?: string; paused?: boolean; children?: ReactNode }) {
  const { enabled, toggle } = useGameAudio();
  return <div className="world-hud" inert={paused}>
    <header className="world-title"><span className="world-brand" aria-hidden="true">B</span><div>{area && <p>{area}</p>}<h1>{title}</h1>{children}</div></header>
    <div className="world-tools"><button className="world-audio" data-audio="quiet" onClick={toggle} aria-pressed={enabled} aria-label={enabled ? "Disattiva audio" : "Attiva audio"}>{enabled ? "♫" : "♪"}<span>{enabled ? "Audio on" : "Audio off"}</span></button>
      <details className="world-menu" data-world-menu onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); const links = Array.from(event.currentTarget.querySelectorAll("a")); const index = links.indexOf(document.activeElement as HTMLAnchorElement);
          links[(index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length]?.focus();
        }
      }}><summary>☰ <span>Menu</span></summary><nav aria-label="Menu di gioco"><Link href="/">Città di Torino</Link><Link href="/gilda/mappa">Gilda del Grifone</Link><Link href="/imprese">Le mie imprese</Link><Link href="/gilda">Il mio accesso</Link><p>Frecce / WASD per muoverti.<br />Invio per interagire.<br />Tab / frecce nei popup, Esc per chiudere.</p><p className="world-touch-hint">Trascina il joystick per camminare e tocca il nome del luogo per entrare. Puoi anche scegliere le frecce a schermo.</p></nav></details>
    </div>
  </div>;
}
type GuideMap = { world: { width: number; height: number }; player: RefObject<{ x: number; y: number }>; points: { x: number; y: number; symbol?: string }[] };
function GuideOverview({ map }: { map: GuideMap }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const draw = () => { if (!document.hidden) drawWorldOverview(ctx, map.world, map.player.current, map.points); };
    draw(); const timer = setInterval(draw, 200);
    return () => clearInterval(timer);
  }, [map]);
  return <canvas ref={canvas} width={136} height={136} className={styles.overview} aria-label="Mappa dei luoghi. Il quadratino rosso indica la tua posizione." />;
}
export function WorldGuide({ places, map, onDestination, paused }: { places: { id: string; name: string; symbol?: string }[]; map: GuideMap; onDestination: (id: string | null) => void; paused: boolean }) {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const resume = () => container.current?.closest(".world-shell")?.querySelector<HTMLCanvasElement>("canvas.map-canvas, canvas.guild-canvas")?.focus();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  usePopupSound(open && !paused);
  return <div ref={container} className={`world-guide ${styles.guide}`} inert={paused} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); resume(); }
    if (open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("section button"));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }}><button aria-expanded={open} aria-controls="world-map-guide" onClick={() => { setOpen(value => !value); if (open) resume(); }} aria-label={open ? "Chiudi i luoghi da esplorare" : "Scegli un luogo da esplorare"}>⌖<span>Esplora</span></button>
    {open && <section id="world-map-guide" aria-label="Luoghi da esplorare"><h2>Dove andiamo?</h2><div className={styles.guideIntro}><GuideOverview map={map} /><p>Il quadratino rosso sei tu.<br /><br />Scegli un luogo e segui la freccia.</p></div><div className={styles.destinations}>{places.map((place, i) => <button key={place.id} aria-pressed={destination === place.id} onClick={() => { setDestination(place.id); onDestination(place.id); setOpen(false); resume(); }}><b>{place.symbol || String(i + 1).padStart(2, "0")}</b><span>{place.name}</span><span aria-hidden="true">↗</span></button>)}</div></section>}
    {destination && !open && <button className={styles.destination} onClick={() => { setDestination(null); onDestination(null); resume(); }} aria-label="Annulla la destinazione"><span>⌖ {places.find(place => place.id === destination)?.name}</span><span aria-hidden="true">×</span></button>}
  </div>;
}
export function WorldInteraction({ name, hint, onOpen }: { name?: string; hint?: string; onOpen: () => void }) {
  return <div className={`interaction-prompt world-interaction ${name ? "is-visible" : ""}`} aria-live="polite" data-sound="manual">{name && <button onClick={onOpen}><span className="prompt-icon">!</span><span><small>SEI VICINO A · TOCCA PER ESPLORARE</small>{name}{hint && <em className="guild-event-hint">{hint}</em>}</span><kbd>INVIO ↵</kbd></button>}</div>;
}
