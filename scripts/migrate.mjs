import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { migrationClient } from "./database.mjs";

const db = migrationClient();
try {
  await db.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(847302901)`;
    await tx`CREATE SCHEMA IF NOT EXISTS tq_internal`;
    await tx`CREATE TABLE IF NOT EXISTS tq_internal.migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;
    const dir = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(dir)).filter(name => name.endsWith(".sql")).sort()) {
      const content = await readFile(new URL(name, dir), "utf8");
      const checksum = createHash("sha256").update(content).digest("hex");
      const [previous] = await tx`SELECT checksum FROM tq_internal.migrations WHERE name = ${name}`;
      if (previous) {
        if (previous.checksum !== checksum) throw new Error(`Migrazione già applicata ma modificata: ${name}`);
        continue;
      }
      await tx.unsafe(content);
      await tx`INSERT INTO tq_internal.migrations(name, checksum) VALUES (${name}, ${checksum})`;
      console.log(`Applicata: ${name}`);
    }
  });
  console.log("Database aggiornato.");
} catch (error) {
  console.error(`Migrazione non completata (${error.code || error.name}). Nessuna modifica parziale è stata salvata.`);
  process.exitCode = 1;
} finally { await db.end(); }
