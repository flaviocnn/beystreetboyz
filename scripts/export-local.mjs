import { mkdir, writeFile } from "node:fs/promises";
import { migrationClient } from "./database.mjs";

const url = new URL(process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/torino_quest") {
  throw new Error("Questa esportazione legge solo il database locale.");
}
const db = migrationClient();
try {
  const [members, messages] = await Promise.all([
    db`SELECT id, first_name, last_name, fiscal_code, document_number, email, phone,
      challonge_username, challonge_id, membership_status, payment_method, payment_paid,
      fee_cents, must_change_password, auth_version, avatar_style, avatar_color,
      password_salt, password_hash, score, created_at FROM public.members ORDER BY id`,
    db`SELECT id, member_id, day, body, created_at FROM public.guild_messages ORDER BY id`,
  ]);
  const payload = {
    format: "torino-quest-v1",
    exportedAt: new Date().toISOString(),
    source: "local-postgres",
    members,
    guild_messages: messages,
  };
  const folder = new URL("../.local-data/", import.meta.url);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await writeFile(new URL("local-export.json", folder), JSON.stringify(payload, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(`Copia locale salvata: ${members.length} membri e ${messages.length} messaggi. File riservato in .local-data/local-export.json.`);
} catch (error) {
  console.error(`Esportazione non completata (${error.code || error.name}).`);
  process.exitCode = 1;
} finally { await db.end(); }
