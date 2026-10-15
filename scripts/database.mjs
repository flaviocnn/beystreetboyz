import postgres from "postgres";

export function migrationClient() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Configura DATABASE_MIGRATION_URL o DATABASE_URL in .env.local.");
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  return postgres(url, { prepare: false, max: 1, connect_timeout: 10, ssl: local ? false : "require" });
}
