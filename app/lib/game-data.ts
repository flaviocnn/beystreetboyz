"use client";
import { createAsyncCache } from "./async-cache";
import { readResponse, type PlayerMember } from "./client-api";
import type { AchievementAlbum } from "./achievements";

const dataCache = createAsyncCache<unknown>();
let identity: string | null | undefined;
export function invalidateGameData() { dataCache.clear(); }
function assertIdentity(memberId: string) { if (identity !== undefined && identity !== memberId) throw new Error("La sessione è cambiata. Riapri la pagina."); }
export async function getGameSession(): Promise<{ member: PlayerMember | null }> {
  // Only concurrent session reads are coalesced; permissions are never cached.
  const data = await dataCache.get("session", 0, () => fetch("/api/member/session", { cache: "no-store" }).then(readResponse)) as { member: PlayerMember | null };
  if (identity !== (data.member?.id ?? null)) {
    const changed = identity !== undefined; identity = data.member?.id ?? null; dataCache.clear();
    if (changed) window.dispatchEvent(new Event("torino-session-changed"));
  }
  return data;
}
export async function getGameData<T>(url: string, memberId: string, ttl = 30000, force = false): Promise<T> {
  assertIdentity(memberId);
  const value = await dataCache.get(`${memberId}:${url}`, ttl, () => fetch(force ? `${url}${url.includes("?") ? "&" : "?"}fresh=1` : url, { cache: "no-store" }).then(readResponse), force);
  assertIdentity(memberId);
  return value as T;
}
export async function getAchievementAlbum(memberId: string, force = false): Promise<AchievementAlbum> {
  assertIdentity(memberId);
  return dataCache.get(`${memberId}:achievements`, 60000, async () => {
    const album = await fetch("/api/member/achievements", { method: "POST", cache: "no-store" }).then(readResponse) as AchievementAlbum;
    assertIdentity(memberId);
    if (identity === memberId && album.newlyUnlocked.length) window.dispatchEvent(new CustomEvent("torino-achievements-unlocked", { detail: album }));
    return album;
  }, force) as Promise<AchievementAlbum>;
}
