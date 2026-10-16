import { validSlotKey } from "./slot-machine";
type RoundStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function createSlotRecovery(storage: () => RoundStorage | null) {
  const memory = new Map<string, string>(), name = (id: string) => `bsb-slot:${id}`;
  const get = (id: string) => {
    let key = memory.get(id) ?? null;
    try { key ??= storage()?.getItem(name(id)) ?? null; } catch {}
    return validSlotKey(key) ? key : null;
  };
  return {
    get,
    remember(id: string, key: string) {
      memory.set(id, key);
      try { storage()?.setItem(name(id), key); } catch {}
    },
    clear(id: string, expected: string) {
      // An older response must never erase a newer component's pending round.
      if (get(id) !== expected) return;
      memory.delete(id);
      try { storage()?.removeItem(name(id)); } catch {}
    },
    requestKey(id: string, displayed: string | null, fresh: () => string) {
      // "Recover" must keep the displayed key even if an unmounted request
      // has completed and already cleared storage. Never create a fresh spin.
      return displayed ?? get(id) ?? fresh();
    },
  };
}
