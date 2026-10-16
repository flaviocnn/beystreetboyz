"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { solarLight, validWeather, weatherLabel, WEATHER_INTERVAL, type TorinoWeather, type WeatherResponse } from "../lib/world-weather";
import "./world-weather.css";
type Environment = { now: number | null; weather: TorinoWeather | null; stale: boolean; reducedMotion: boolean };
const Context = createContext<Environment>({ now: null, weather: null, stale: true, reducedMotion: false });
const CACHE_KEY = "bsb-torino-weather-v1";
export function WorldWeatherProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Environment>({ now: null, weather: null, stale: true, reducedMotion: false });
  useEffect(() => {
    const controller = new AbortController(), motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let offset = 0, fetchedAt = 0, busy = false, retryAt = 0;
    const tick = () => {
      if (controller.signal.aborted || document.hidden) return;
      const now = Date.now() + offset;
      setState(current => ({ ...current, now, reducedMotion: motion.matches,
        weather: current.weather && validWeather(current.weather, now) ? current.weather : null,
        stale: current.stale || !current.weather || now - current.weather.observedAt > 45 * 60000 }));
    };
    async function refresh() {
      if (busy || document.hidden || Date.now() < retryAt || Date.now() - fetchedAt < WEATHER_INTERVAL) return;
      busy = true;
      try {
        const response = await fetch("/api/world/weather", { cache: "no-store", signal: controller.signal });
        const data = await response.json() as WeatherResponse;
        if (controller.signal.aborted) return;
        if (!response.ok || !Number.isFinite(data.serverNow) || !validWeather(data.weather, data.serverNow)) throw new Error("weather_unavailable");
        // The CDN can serve a response several minutes old; do not mistake its
        // generation timestamp for the current time and move the clock backwards.
        const age = Number(response.headers.get("age") ?? 0) * 1000;
        offset = Math.abs(data.serverNow + age - Date.now()) < 5 * 60000 ? data.serverNow + age - Date.now() : 0;
        fetchedAt = data.stale ? 0 : Date.now(); retryAt = data.stale ? Date.now() + 60000 : 0;
        setState({ now: Date.now() + offset, weather: data.weather, stale: data.stale, reducedMotion: motion.matches });
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* Storage is optional. */ }
      } catch {
        if (!controller.signal.aborted) { retryAt = Date.now() + 60000; setState(current => ({ ...current, stale: true })); }
      } finally { busy = false; }
    }
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      try {
        const saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? "null") as WeatherResponse | null;
        if (saved && validWeather(saved.weather, Date.now())) setState({ now: Date.now(), weather: saved.weather, stale: true, reducedMotion: motion.matches });
      } catch { /* Invalid/expired cache never becomes real weather. */ }
      tick(); void refresh();
    });
    const timer = window.setInterval(() => { tick(); void refresh(); }, 60000);
    const resume = () => { tick(); void refresh(); };
    window.addEventListener("focus", resume); document.addEventListener("visibilitychange", resume); motion.addEventListener("change", tick);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); motion.removeEventListener("change", tick); };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useWorldWeather() { return useContext(Context); }
export function WorldWeatherBadge({ indoor = false }: { indoor?: boolean }) {
  const state = useWorldWeather();
  if (indoor) return null;
  const light = state.now ? solarLight(state.now) : null;
  const time = state.now ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(state.now) : "…";
  return <details className={`world-weather-badge ${indoor ? "is-indoor" : ""}`} data-world-weather>
    <summary>TORINO · {light?.phase ?? "…"} · {state.weather ? `${Math.round(state.weather.temperature)}° · ${weatherLabel(state.weather)}` : "Meteo non disponibile"}{state.stale && state.weather ? " · ultimo dato" : ""}</summary>
    <div><p>Ora di Torino: {time}.</p>
      <p>{state.weather ? `Ultimo aggiornamento: ${new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(state.weather.observedAt)}${state.stale ? " · In attesa di aggiornamenti." : "."}` : "Il meteo non è disponibile al momento."}</p>
      {state.weather && <p>Vento: {Math.round(state.weather.wind)} km/h.</p>}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Meteo: Open-Meteo · CC BY 4.0 ↗</a>
    </div>
  </details>;
}
