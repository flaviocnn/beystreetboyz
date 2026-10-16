"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { achievementDefinition, type AchievementId } from "../lib/achievements";
import { usePopupSound } from "../lib/game-audio";
import "./achievement-notice.css";

export default function AchievementNotice() {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState<AchievementId[]>([]);
  const [coinDelta, setCoinDelta] = useState(0);
  usePopupSound(unlocked.length > 0);
  useEffect(() => {
    const controller = new AbortController(); let running = false;
    async function sync() {
      if (document.hidden || running) return; running = true;
      try {
        const response = await fetch("/api/member/achievements", { method: "POST", cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const album = await response.json();
        if (!controller.signal.aborted && Array.isArray(album.newlyUnlocked) && album.newlyUnlocked.length) {
          setUnlocked(album.newlyUnlocked.filter((id: string) => achievementDefinition(id)));
          setCoinDelta(Number.isSafeInteger(album.beycoins?.delta) ? album.beycoins.delta : 0);
        }
      } catch { /* Non-blocking: the personal album exposes errors and a retry. */ }
      finally { running = false; }
    }
    void sync(); const timer = window.setInterval(() => void sync(), 45000);
    const refresh = () => void sync(); window.addEventListener("focus", refresh); window.addEventListener("torino-achievements-changed", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("torino-achievements-changed", refresh); };
  }, [pathname]);
  useEffect(() => { if (!unlocked.length) return; const timeout = window.setTimeout(() => setUnlocked([]), 14000); return () => window.clearTimeout(timeout); }, [unlocked]);
  if (!unlocked.length) return null;
  return <aside className="achievement-notice" aria-label="Nuove imprese"><div role="status"><small>IMPRESA SBLOCCATA{unlocked.length > 1 ? ` · ${unlocked.length}` : ""}</small><strong>{achievementDefinition(unlocked[0])?.name}{unlocked.length > 1 ? ` e altre ${unlocked.length - 1}` : ""}</strong>{coinDelta > 0 && <small>+{coinDelta} BEYCOIN</small>}</div><a href="/imprese">APRI L’ALBUM →</a><button aria-label="Chiudi notifica achievement" onClick={() => setUnlocked([])}>×</button></aside>;
}
