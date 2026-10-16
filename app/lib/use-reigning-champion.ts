"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChampionResponse } from "./reigning-champion";
const empty: ChampionResponse = { champion: null, canUseThrone: false };
export function useReigningChampion(memberId: string | undefined) {
  const [state, setState] = useState({ ...empty, memberId: "", error: "", loading: true });
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async (): Promise<ChampionResponse | null> => {
    if (!memberId) return null;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    try {
      const response = await fetch("/api/guild/champion", { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Campione non disponibile");
      if (controller.signal.aborted) return null;
      setState(current => current.memberId === memberId && !current.error && !current.loading
        && JSON.stringify({ champion: current.champion, canUseThrone: current.canUseThrone }) === JSON.stringify(data)
        ? current : { ...data, memberId, error: "", loading: false });
      return data;
    } catch (error) {
      if (!controller.signal.aborted) setState({ ...empty, memberId, error: error instanceof Error ? error.message : "Campione non disponibile", loading: false });
      return null;
    }
  }, [memberId]);
  useEffect(() => {
    if (!memberId) return;
    let live = true;
    void Promise.resolve().then(() => { if (live) void refresh(); });
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    const focus = () => { void refresh(); };
    const visibility = () => { if (!document.hidden) void refresh(); };
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visibility);
    return () => { live = false; clearInterval(timer); pending.current?.abort(); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); };
  }, [memberId, refresh]);
  return { ...(state.memberId === memberId ? state : { ...empty, error: "", loading: true }), refresh };
}
export type ChampionState = ReturnType<typeof useReigningChampion>;
