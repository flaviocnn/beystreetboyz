"use client";
import { useEffect } from "react";
export function useDialogFocus(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]';
    dialog.querySelector<HTMLElement>(selector)?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(selector)).filter((el) => el.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [open]);
}
