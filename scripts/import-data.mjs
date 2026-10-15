import { readFile } from "node:fs/promises";
import { migrationClient } from "./database.mjs";

const path = process.argv[2];
if (!path) throw new Error("Uso: npm run db:import -- .local-data/sites-export.json");
const data = JSON.parse(await readFile(path, "utf8"));
if (data.format !== "torino-quest-v1" || !Array.isArray(data.members) || !Array.isArray(data.guild_messages)) throw new Error("Formato di esportazione non valido.");
const memberFields = ["id", "first_name", "last_name", "fiscal_code", "document_number", "email", "phone", "challonge_username", "challonge_id", "membership_status", "payment_method", "payment_paid", "fee_cents", "must_change_password", "auth_version", "avatar_style", "avatar_color", "password_salt", "password_hash", "score", "created_at"];
const messageFields = ["id", "member_id", "day", "body", "created_at"];
const boolean = (value, nullable = false) => {
  if (nullable && value === null) return null;
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  throw new Error("Valore booleano non valido nel backup.");
};
const normalize = (row, fields) => {
  if (fields.some(key => !Object.hasOwn(row, key))) throw new Error("Colonne mancanti nel backup.");
  return Object.fromEntries(fields.map(key => [key, key === "payment_paid" ? boolean(row[key], true) : key === "must_change_password" ? boolean(row[key]) : row[key]]));
};
const members = data.members.map(row => normalize(row, memberFields));
const messages = data.guild_messages.map(row => normalize(row, messageFields));
const db = migrationClient();
let insertedMembers = 0, insertedMessages = 0;
try {
  await db.begin(async tx => {
    for (const row of members) {
      const result = await tx`INSERT INTO public.members ${tx(row, memberFields)} ON CONFLICT (id) DO NOTHING RETURNING id`;
      insertedMembers += result.length;
    }
    for (const row of messages) {
      const result = await tx`INSERT INTO public.guild_messages ${tx(row, messageFields)} ON CONFLICT (id) DO NOTHING RETURNING id`;
      insertedMessages += result.length;
    }
  });
  console.log(`Importati ${insertedMembers} membri e ${insertedMessages} messaggi. Gli ID già presenti non sono stati modificati.`);
} catch (error) {
  console.error(`Importazione annullata (${error.code || error.name}). Controlla compatibilità e conflitti: nessun dato è stato importato parzialmente.`);
  process.exitCode = 1;
} finally { await db.end(); }
