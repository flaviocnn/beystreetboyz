const loopback = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isLocalDatabase(url = process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["postgres:", "postgresql:"].includes(parsed.protocol) && loopback.has(parsed.hostname)
      && !["host", "hostaddr", "service"].some(key => parsed.searchParams.has(key));
  } catch { return false; }
}

export function localDevelopmentEnabled() {
  return process.env.NODE_ENV === "development" && !process.env.VERCEL && isLocalDatabase();
}

export function localDevelopmentRequest(request: Request) {
  if (!localDevelopmentEnabled()) return false;
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    return loopback.has(url.hostname) && (!host || loopback.has(new URL(`${url.protocol}//${host}`).hostname));
  } catch { return false; }
}

export function assertDevelopmentDatabaseIsLocal() {
  if (process.env.NODE_ENV !== "production" && !isLocalDatabase()) {
    throw new Error("Sicurezza locale: configura PostgreSQL Docker locale in .env.local, non il database di produzione.");
  }
}
