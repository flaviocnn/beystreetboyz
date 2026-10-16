"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { drawBankRoom } from "../lib/bank-art";
import type { Avatar, Direction } from "../lib/pixel-player";
import { useWorldWeather, WorldWeatherBadge } from "../components/world-weather";
import { createAtmospherePaint, drawWorldAtmosphere } from "../lib/world-atmosphere";
import { WorldDpad } from "../components/world-controls";

export type BankDesk = "ratilde" | "ledger" | "rodi";
const desks = [{ id: "ratilde", x: 240, name: "RATILDE" }, { id: "ledger", x: 500, name: "REGISTRO INTROITI" }, { id: "rodi", x: 760, name: "MASTRO RODI" }] as const;
const directions: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
const defaultAvatar = { avatarStyle: 0, avatarColor: 0 };
export default function BankRoom({ avatar = defaultAvatar, paused, onOpen, onStep }: { avatar?: Avatar; paused: boolean; onOpen: (desk: BankDesk) => void; onStep: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), keys = useRef(new Set<Direction>()), pausedRef = useRef(paused);
  const weather = useWorldWeather(), weatherRef = useRef(weather);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  const player = useRef({ x: 500, y: 468, dir: "up" as Direction, walking: false });
  const near = useRef<BankDesk | null>(null), [nearby, setNearby] = useState<BankDesk | null>(null);
  useEffect(() => { pausedRef.current = paused; if (paused) keys.current.clear(); }, [paused]);
  const step = useCallback((direction: Direction, distance: number) => {
    const p = player.current;
    p.x = Math.max(52, Math.min(948, p.x + (direction === "left" ? -distance : direction === "right" ? distance : 0)));
    p.y = Math.max(363, Math.min(502, p.y + (direction === "up" ? -distance : direction === "down" ? distance : 0)));
    p.dir = direction;
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    let frame = 0, previous = performance.now(), lastStep = 0;
    const atmosphere = createAtmospherePaint();
    const draw = (now: number) => {
      const dt = Math.min(32, now - previous); previous = now;
      const p = player.current;
      const beforeX = p.x, beforeY = p.y;
      if (!pausedRef.current) for (const dir of keys.current) step(dir, dt * .19 / (keys.current.size > 1 ? Math.SQRT2 : 1));
      p.walking = p.x !== beforeX || p.y !== beforeY;
      if (p.walking && now - lastStep > 245) { onStep(); lastStep = now; }
      const desk = desks.find(desk => Math.hypot(p.x - desk.x, p.y - 354) < 82)?.id ?? null;
      if (desk !== near.current) { near.current = desk; setNearby(desk); }
      drawBankRoom(ctx, now, p, avatar);
      drawWorldAtmosphere(ctx, 1000, 540, now, weatherRef.current, atmosphere, true);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    const down = (event: KeyboardEvent) => {
      if (pausedRef.current || (event.target instanceof Element && event.target.closest("input,select,textarea,button,a,summary,[data-world-weather]"))) return;
      const direction = directions[event.key] ?? directions[event.key.toLowerCase()];
      if (direction) { event.preventDefault(); if (!keys.current.has(direction)) step(direction, 8); keys.current.add(direction); }
      if (event.key === "Enter" && near.current && !event.repeat) { event.preventDefault(); onOpen(near.current); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(directions[event.key] ?? directions[event.key.toLowerCase()]);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); document.addEventListener("visibilitychange", blur);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); document.removeEventListener("visibilitychange", blur); };
  }, [avatar, onOpen, onStep, step]);
  return <div className="bank-room">
    <WorldWeatherBadge indoor />
    <canvas ref={canvas} width={1000} height={540} aria-label="Sala della banca: tre contabili con orecchie, baffi e muso da ratto lavorano ai banconi davanti al caveau. Muoviti con frecce o WASD. Avvicinati a un banco e premi Invio, oppure usa i pulsanti sotto." />
    <div className="bank-room-controls"><div className="bank-dpad" aria-label="Muovi il tuo avatar">{(["left", "up", "down", "right"] as Direction[]).map(dir => <button key={dir} disabled={paused} aria-label={`Vai ${dir === "left" ? "a sinistra" : dir === "right" ? "a destra" : dir === "up" ? "su" : "giù"}`}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); step(dir, 8); keys.current.add(dir); }} onPointerUp={() => keys.current.delete(dir)} onPointerCancel={() => keys.current.delete(dir)} onLostPointerCapture={() => keys.current.delete(dir)} onClick={event => { if (event.detail === 0) step(dir, 8); }}>{dir === "up" ? "↑" : dir === "down" ? "↓" : dir === "left" ? "←" : "→"}</button>)}</div>
      <WorldDpad paused={paused} onDirection={(dir, active) => { if (active && !pausedRef.current) { if (!keys.current.has(dir)) step(dir, 8); keys.current.add(dir); } else keys.current.delete(dir); }} />
      <p>Joystick o frecce per camminare · Avvicinati ai banconi per parlare</p>
      {nearby && <button className="solid-button" disabled={paused} onClick={() => onOpen(nearby)}>PARLA / {desks.find(desk => desk.id === nearby)?.name} ↵</button>}
    </div>
  </div>;
}
