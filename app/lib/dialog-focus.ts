"use client";
import { useEffect } from "react";
import { usePopupSound } from "./game-audio";
export function useDialogFocus(open: boolean) {
  usePopupSound(open);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const worldCanvas = dialog.closest(".world-shell")?.querySelector<HTMLCanvasElement>("canvas.map-canvas, canvas.guild-canvas");
    const selector = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]';
    (dialog.querySelector<HTMLElement>('.modal-enter') || dialog.querySelector<HTMLElement>(selector))?.focus();
    const trap = (event: KeyboardEvent) => {
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter((el) => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (!first) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.matches('input, textarea, select') && event.key !== "Tab") return;
      if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const offset = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
        const index = items.indexOf(active!);
        items[(index + offset + items.length) % items.length].focus();
        return;
      }
      if (event.key === " " && active?.matches('a[href]')) { event.preventDefault(); active.click(); return; }
      if (event.key !== "Tab") return;
      if (!dialog.contains(active)) { event.preventDefault(); first.focus(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      // Closing an in-world popup returns the arrow keys to walking immediately.
      (worldCanvas || previous)?.focus();
    };
  }, [open]);
}
