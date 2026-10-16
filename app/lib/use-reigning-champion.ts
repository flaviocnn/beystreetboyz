"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChampionResponse } from "./reigning-champion";
import { getGameData } from "./game-data";
const empty: ChampionResponse = { champion: null, canUseThrone: false };
export function useReigningChampion(memberId: string | undefined) {
  const [state, setState] = useState({ ...empty, memberId: "", error: "", loading: true });
  const generation = useRef(0);
  const cancelPending = useCallback(() => { generation.current++; }, []);
  const refresh = useCallback(async (force = true): Promise<ChampionResponse | null> => {
    if (!memberId) return null;
    const currentGeneration = ++generation.current;
    try {
      const data = await getGameData<ChampionResponse>("/api/guild/champion", memberId, 30000, force);
      if (currentGeneration !== generation.current) return null;
      setState(current => current.memberId === memberId && !current.error && !current.loading
        && JSON.stringify({ champion: current.champion, canUseThrone: current.canUseThrone }) === JSON.stringify(data)
        ? current : { ...data, memberId, error: "", loading: false });
      return data;
    } catch (error) {
      if (currentGeneration === generation.current) setState({ ...empty, memberId, error: error instanceof Error ? error.message : "Campione non disponibile", loading: false });
      return null;
    }
  }, [memberId]);
  useEffect(() => {
    if (!memberId) return;
    let live = true;
    void Promise.resolve().then(() => { if (live) void refresh(false); });
    const timer = setInterval(() => { if (!document.hidden) void refresh(false); }, 30000);
    const focus = () => { if (!document.hidden) void refresh(false); };
    const visibility = focus;
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", visibility);
    return () => { live = false; cancelPending(); clearInterval(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visibility); };
  }, [memberId, refresh, cancelPending]);
  return { ...(state.memberId === memberId ? state : { ...empty, error: "", loading: true }), refresh };
}
export type ChampionState = ReturnType<typeof useReigningChampion>;
