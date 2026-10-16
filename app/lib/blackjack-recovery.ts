import { validSlotKey } from "./slot-machine";
import type { BlackjackAction } from "./blackjack";
export function parseBlackjackAction(value: unknown): BlackjackAction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!validSlotKey(row.requestKey)) return null;
  if (row.action === "start" && Object.keys(row).length === 2) return { requestKey: row.requestKey, action: "start" };
  if ((row.action === "hit" || row.action === "stand") && Object.keys(row).length === 4 && validSlotKey(row.handId)
    && Number.isSafeInteger(row.version) && Number(row.version) >= 0 && Number(row.version) <= 52)
    return { requestKey: row.requestKey, action: row.action, handId: row.handId, version: Number(row.version) };
  return null;
}
export function createBlackjackRecovery(storage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">) {
  const memory = new Map<string, BlackjackAction>(), name = (id: string) => `bsb-blackjack:${id}`;
  const get = (id: string) => {
    const saved = memory.get(id); if (saved) return saved;
    try { return parseBlackjackAction(JSON.parse(storage().getItem(name(id)) ?? "null")); } catch { return null; }
  };
  return { get, remember(id: string, input: BlackjackAction) { memory.set(id, input); try { storage().setItem(name(id), JSON.stringify(input)); } catch {} },
    clear(id: string, key: string) { if (get(id)?.requestKey !== key) return; memory.delete(id); try { storage().removeItem(name(id)); } catch {} } };
}
