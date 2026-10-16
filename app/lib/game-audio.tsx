"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SoundEngine, type GameSound } from "./sound-engine";

const STORAGE_KEY = "torino-quest-audio";
export function usePopupSound(open: boolean | string | null | undefined) {
  const previous = useRef<typeof open>(false);
  useEffect(() => {
    if (previous.current !== open && (previous.current || open)) window.dispatchEvent(new CustomEvent("torino-popup", { detail: !!open }));
    previous.current = open;
  }, [open]);
  useEffect(() => () => { if (previous.current) { previous.current = false; window.dispatchEvent(new CustomEvent("torino-popup", { detail: false })); } }, []);
}
const Context = createContext({ enabled: true, toggle: () => {}, playClick: () => {}, playStep: () => {} });
export function GameAudioProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const engine = useRef<SoundEngine | null>(null);
  const pathname = usePathname();
  const musicArea = ["/", "/gilda", "/gilda/mappa", "/wistery", "/banca", "/imprese"].includes(pathname);
  const theme = pathname.startsWith("/wistery") ? "wistery" : pathname.startsWith("/gilda") || pathname === "/imprese" || pathname === "/banca" ? "guild" : "city";
  const play = useCallback((kind: GameSound) => { void engine.current?.play(kind); }, []);
  useEffect(() => {
    const sound = new SoundEngine(() => new AudioContext()); engine.current = sound;
    try { if (localStorage.getItem(STORAGE_KEY) === "off") { sound.enabled = false; queueMicrotask(() => setEnabled(false)); } } catch { /* Storage is optional. */ }
    const begin = () => { void sound.activate(); };
    const click = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest('button, a[href], [role="button"]') : null;
      if (target && !target.closest('[data-audio="quiet"]') && !target.matches(':disabled')) play("click");
    };
    const change = (event: Event) => { if (event.target instanceof Element && event.target.matches('select, input[type="checkbox"], input[type="radio"], input[type="color"]')) play("click"); };
    const popup = (event: Event) => play((event as CustomEvent<boolean>).detail ? "open" : "close");
    const details = (event: Event) => { if (event.target instanceof HTMLDetailsElement) play(event.target.open ? "open" : "close"); };
    // Announce asynchronous status/error messages too, not every keystroke or canvas frame.
    const messages = new WeakMap<Element, string>();
    const announce = (element: Element) => {
      if (element.closest('[data-sound="manual"]')) return;
      const text = element.textContent?.trim() ?? "";
      if (text && messages.get(element) !== text) { messages.set(element, text); play(element.getAttribute("role") === "alert" ? "error" : "message"); }
    };
    document.querySelectorAll('[role="status"], [role="alert"]').forEach(element => messages.set(element, element.textContent?.trim() ?? ""));
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        const status = target?.closest('[role="status"], [role="alert"]'); if (status) announce(status);
        for (const node of record.addedNodes) if (node instanceof Element) {
          if (node.matches('[role="status"], [role="alert"]')) announce(node);
          node.querySelectorAll('[role="status"], [role="alert"]').forEach(announce);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("pointerdown", begin); window.addEventListener("keydown", begin);
    document.addEventListener("click", click); document.addEventListener("change", change); document.addEventListener("toggle", details, true); window.addEventListener("torino-popup", popup);
    return () => { observer.disconnect(); sound.dispose(); engine.current = null;
      window.removeEventListener("pointerdown", begin); window.removeEventListener("keydown", begin); document.removeEventListener("click", click); document.removeEventListener("change", change); document.removeEventListener("toggle", details, true); window.removeEventListener("torino-popup", popup); };
  }, [play]);
  useEffect(() => {
    if (!musicArea) return;
    const melody = theme === "guild" ? [392, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 440, 392, 493.88, 587.33, 659.25, 587.33, 493.88, 440, 392] : theme === "wistery" ? [329.63, 392, 493.88, 0, 440, 392, 369.99, 0, 329.63, 493.88, 659.25, 587.33, 493.88, 440, 369.99, 0] : [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33];
    const bass = theme === "guild" ? [98, 98, 130.81, 130.81, 110, 110, 146.83, 146.83] : theme === "wistery" ? [82.41, 82.41, 98, 98, 110, 110, 92.5, 92.5] : [130.81, 130.81, 146.83, 146.83, 110, 110, 123.47, 123.47];
    let beat = 0;
    const timer = setInterval(() => { if (document.hidden) return; engine.current?.tone(melody[beat % melody.length], .105, .018); if (beat % 2 === 0) engine.current?.tone(bass[Math.floor(beat / 2) % bass.length], .16, .025, "triangle"); beat++; }, theme === "guild" ? 220 : theme === "wistery" ? 245 : 185);
    return () => clearInterval(timer);
  }, [theme, musicArea]);
  const toggle = useCallback(() => { const sound = engine.current; if (!sound) return; sound.enabled = !sound.enabled; setEnabled(sound.enabled); try { localStorage.setItem(STORAGE_KEY, sound.enabled ? "on" : "off"); } catch {} if (sound.enabled) void sound.play("open"); }, []);
  const playClick = useCallback(() => play("click"), [play]), playStep = useCallback(() => play("step"), [play]);
  return <Context.Provider value={{ enabled, toggle, playClick, playStep }}>{children}</Context.Provider>;
}
export function useGameAudio(theme?: "city" | "guild" | "wistery") { void theme; return useContext(Context); }
