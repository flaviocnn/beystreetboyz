"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { achievementDefinition, type AchievementId } from "../lib/achievements";
import { usePopupSound } from "../lib/game-audio";
import "./achievement-notice.css";
import { getGameSession, getAchievementAlbum, invalidateGameData } from "../lib/game-data";
import type { AchievementAlbum } from "../lib/achievements";

export default function AchievementNotice() {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState<AchievementId[]>([]);
  const [coinDelta, setCoinDelta] = useState(0);
  usePopupSound(unlocked.length > 0);
  useEffect(() => {
    let live = true, running = false, lastAuthCheck = 0;
    async function sync() {
      if (document.hidden || running || Date.now() - lastAuthCheck < 5000) return; running = true;
      try {
        const { member } = await getGameSession();
        lastAuthCheck = Date.now();
        if (live && member && !member.mustChangePassword) await getAchievementAlbum(member.id);
      } catch { /* Non-blocking: the personal album exposes errors and a retry. */ }
      finally { running = false; }
    }
    const unlocked = (event: Event) => {
      const album = (event as CustomEvent<AchievementAlbum>).detail;
      if (!live) return;
      setUnlocked(album.newlyUnlocked.filter(id => achievementDefinition(id)));
      setCoinDelta(Number.isSafeInteger(album.beycoins?.delta) ? album.beycoins.delta : 0);
    };
    const refresh = () => void sync();
    const changed = () => { invalidateGameData(); lastAuthCheck = 0; void sync(); };
    const sessionChanged = () => { invalidateGameData(); window.location.reload(); };
    window.addEventListener("torino-session-changed", sessionChanged);
    window.addEventListener("torino-achievements-unlocked", unlocked);
    void sync(); const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh); window.addEventListener("torino-achievements-changed", changed);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener("torino-session-changed", sessionChanged); window.removeEventListener("torino-achievements-unlocked", unlocked); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("torino-achievements-changed", changed); };
  }, [pathname]);
  useEffect(() => { if (!unlocked.length) return; const timeout = window.setTimeout(() => setUnlocked([]), 14000); return () => window.clearTimeout(timeout); }, [unlocked]);
  if (!unlocked.length) return null;
  return <aside className="achievement-notice" aria-label="Nuove imprese" data-sound="manual"><div role="status"><small>IMPRESA SBLOCCATA{unlocked.length > 1 ? ` · ${unlocked.length}` : ""}</small><strong>{achievementDefinition(unlocked[0])?.name}{unlocked.length > 1 ? ` e altre ${unlocked.length - 1}` : ""}</strong>{coinDelta > 0 && <small>+{coinDelta} BEYCOIN</small>}</div><Link href="/imprese">APRI L’ALBUM →</Link><button aria-label="Chiudi notifica achievement" onClick={() => setUnlocked([])}>×</button></aside>;
}
