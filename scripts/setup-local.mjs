import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

const password = randomBytes(24).toString("hex");
const url = `postgresql://torino:${password}@127.0.0.1:55432/torino_quest`;
const content = `# Solo sviluppo locale. Non committare questo file.\nPOSTGRES_PASSWORD=${password}\nDATABASE_URL=${url}\nDATABASE_MIGRATION_URL=${url}\nSTAFF_PASSPHRASE=Grifone-${randomBytes(8).toString("hex")}\nSESSION_SECRET=${randomBytes(32).toString("hex")}\n`;
try {
  await writeFile(new URL("../.env.local", import.meta.url), content, { flag: "wx", mode: 0o600 });
  console.log("Creato .env.local con credenziali locali. La parola d’ordine staff si trova nel file.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.local esiste già: mantenuto senza modifiche.");
}
