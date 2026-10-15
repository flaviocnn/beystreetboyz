type Role = "staff" | "member";
type Session = { role: Role; id: string; expires: number; version: number; method: "password" | "challonge" };
const encoder = new TextEncoder();

function secret(name: "STAFF_PASSPHRASE" | "SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} non configurato`);
  return value;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function checkStaffPhrase(input: string) {
  return equal(await digest(input), await digest(secret("STAFF_PASSPHRASE")));
}

async function sign(data: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret("SESSION_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

export async function sessionCookie(role: Role, id: string, request: Request, version = 0, method: "password" | "challonge" = "password") {
  const expires = Date.now() + (role === "staff" ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
  const payload = `${role}.${id}.${expires}.${version}.${method}`;
  const value = `${payload}.${await sign(payload)}`;
  const maxAge = Math.floor((expires - Date.now()) / 1000);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `tq_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `tq_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function getSession(request: Request): Promise<Session | null> {
  const value = request.headers.get("cookie")?.split("; ").find((part) => part.startsWith("tq_session="))?.slice(11);
  if (!value) return null;
  const parts = value.split(".");
  if (![4, 5, 6].includes(parts.length)) return null;
  const [role, id, expiryText] = parts;
  const signature = parts[parts.length - 1];
  const version = parts.length >= 5 ? Number(parts[3]) : 0;
  const method = parts.length === 6 ? parts[4] : "password";
  if (method !== "password" && method !== "challonge") return null;
  const expires = Number(expiryText);
  if ((role !== "staff" && role !== "member") || !id || !Number.isFinite(expires) || expires < Date.now()) return null;
  if (!Number.isSafeInteger(version) || !equal(signature, await sign(parts.slice(0, -1).join(".")))) return null;
  return { role, id, expires, version, method };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    // Next.js can normalize request.url to localhost behind its HTTP server.
    // Host preserves the actual browser destination; do not trust forwarded-host.
    const host = request.headers.get("host") || target.host;
    return source.host === host && source.protocol === target.protocol;
  } catch { return false; }
}

export function newMemberPassword() {
  const words = ["Pinguino", "Polpetta", "Marmellata", "Zuccherino", "Giramondo"];
  const data = crypto.getRandomValues(new Uint8Array(8));
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from(data, (byte) => alphabet[byte % alphabet.length]).join("");
  return `${words[data[0] % words.length]}-${suffix}`;
}

export async function hashPassword(password: string, salt: string) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" }, base, 256);
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  return equal(await hashPassword(password, salt), expected);
}
