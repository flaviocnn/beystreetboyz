"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Direction } from "../lib/pixel-player";
import { useGameAudio, usePopupSound } from "../lib/game-audio";

const NAMES = { up: "su", down: "giù", left: "a sinistra", right: "a destra" };
export function WorldDpad({ paused, onDirection }: { paused: boolean; onDirection: (direction: Direction, active: boolean) => void }) {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); }, []);
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
      }}><summary>☰ <span>Menu</span></summary><nav aria-label="Menu di gioco"><Link href="/">Città di Torino</Link><Link href="/gilda/mappa">Gilda del Grifone</Link><Link href="/imprese">Le mie imprese</Link><Link href="/gilda">Il mio accesso</Link><p>Frecce / WASD per muoverti.<br />Invio per interagire.<br />Tab / frecce nei popup, Esc per chiudere.</p><p className="world-touch-hint">Usa le frecce a schermo e tocca il nome del luogo per entrare.</p></nav></details>
    </div>
  </div>;
}
export function WorldGuide({ places, onChange, paused }: { places: { id: string; name: string; symbol?: string }[]; onChange: (open: boolean) => void; paused: boolean }) {
  const [open, setOpen] = useState(false);
  usePopupSound(open && !paused);
  return <div className="world-guide" inert={paused}><button aria-expanded={open} aria-controls="world-map-guide" onClick={() => { setOpen(value => !value); onChange(!open); }} aria-label={open ? "Nascondi mappa e legenda" : "Mostra mappa e legenda"}>⌖<span>Mappa</span></button>
    {open && <section id="world-map-guide" aria-label="Legenda mappa"><p>La piazza rossa sei tu.</p>{places.map((place, i) => <p key={place.id}><b>{place.symbol || String(i + 1)}</b> {place.name}</p>)}</section>}
  </div>;
}
export function WorldInteraction({ name, hint, onOpen }: { name?: string; hint?: string; onOpen: () => void }) {
  return <div className={`interaction-prompt world-interaction ${name ? "is-visible" : ""}`} aria-live="polite" data-sound="manual">{name && <button onClick={onOpen}><span className="prompt-icon">!</span><span><small>SEI VICINO A · TOCCA PER ESPLORARE</small>{name}{hint && <em className="guild-event-hint">{hint}</em>}</span><kbd>INVIO ↵</kbd></button>}</div>;
}
