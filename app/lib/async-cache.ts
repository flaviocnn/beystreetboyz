/** Bounded, short-lived, in-memory cache. No cookies, HTTP responses or rejected promises. */
export function createAsyncCache<T>(limit = 64, now: () => number = Date.now) {
  const entries = new Map<string, { value?: T; expires: number; pending?: Promise<T> }>();
  return {
    get(key: string, ttl: number, load: () => Promise<T>, force = false): Promise<T> {
      const old = entries.get(key);
      if (!force && old?.pending) return old.pending;
      if (!force && old && old.expires > now() && "value" in old) return Promise.resolve(old.value as T);
      const entry: { value?: T; expires: number; pending?: Promise<T> } = { expires: 0 };
      const pending = Promise.resolve().then(load).then(value => {
        if (entries.get(key) === entry) { entry.value = value; entry.expires = now() + ttl; delete entry.pending; }
        return value;
      }, error => { if (entries.get(key) === entry) entries.delete(key); throw error; });
      entry.pending = pending; entries.delete(key); entries.set(key, entry);
      while (entries.size > limit) entries.delete(entries.keys().next().value!);
      return pending;
    },
    clear() { entries.clear(); },
  };
}
