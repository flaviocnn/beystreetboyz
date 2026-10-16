"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Direction } from "../lib/pixel-player";
import { useGameAudio, usePopupSound } from "../lib/game-audio";
import { createJoystick, joystickKnob } from "../lib/joystick";
import { KEY_DIRECTIONS } from "../lib/world-game";

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
export function WorldHud({ title, area, paused = false, children }: { title: string; area: string; paused?: boolean; children?: ReactNode }) {
  const { enabled, toggle } = useGameAudio();
  return <div className="world-hud" inert={paused}>
    <header className="world-title"><span className="world-brand" aria-hidden="true">B</span><div><p>{area}</p><h1>{title}</h1>{children}</div></header>
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
export function WorldGuide({ places, onChange, paused }: { places: { id: string; name: string; symbol?: string }[]; onChange: (open: boolean) => void; paused: boolean }) {
  const [open, setOpen] = useState(false);
  usePopupSound(open && !paused);
  return <div className="world-guide" inert={paused}><button aria-expanded={open} aria-controls="world-map-guide" onClick={() => { setOpen(value => !value); onChange(!open); }} aria-label={open ? "Nascondi mappa e legenda" : "Mostra mappa e legenda"}>⌖<span>Mappa</span></button>
    {open && <section id="world-map-guide" aria-label="Legenda mappa"><p>Il quadratino rosso sei tu.</p>{places.map((place, i) => <p key={place.id}><b>{place.symbol || String(i + 1)}</b> {place.name}</p>)}</section>}
  </div>;
}
export function WorldInteraction({ name, hint, onOpen }: { name?: string; hint?: string; onOpen: () => void }) {
  return <div className={`interaction-prompt world-interaction ${name ? "is-visible" : ""}`} aria-live="polite" data-sound="manual">{name && <button onClick={onOpen}><span className="prompt-icon">!</span><span><small>SEI VICINO A · TOCCA PER ESPLORARE</small>{name}{hint && <em className="guild-event-hint">{hint}</em>}</span><kbd>INVIO ↵</kbd></button>}</div>;
}
