import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { torinoDb?: ReturnType<typeof createDb> };
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL non configurato. Imposta la connessione PostgreSQL in .env.local o su Vercel.");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  const client = postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10, ssl: local ? false : "require" });
  return drizzle(client, { schema });
}
export function getDb() {
  globalDb.torinoDb ??= createDb();
  return globalDb.torinoDb;
}
