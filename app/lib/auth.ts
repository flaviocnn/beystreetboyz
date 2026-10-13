import { env } from "cloudflare:workers";

type Role = "staff" | "member";
type Session = { role: Role; id: string; expires: number };
const encoder = new TextEncoder();

function secret(name: "STAFF_PASSPHRASE" | "SESSION_SECRET") {
  const value = (env as unknown as Record<string, string | undefined>)[name];
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

export async function sessionCookie(role: Role, id: string, request: Request) {
  const expires = Date.now() + (role === "staff" ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000);
  const payload = `${role}.${id}.${expires}`;
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
  if (parts.length !== 4) return null;
  const [role, id, expiryText, signature] = parts;
  const expires = Number(expiryText);
  if ((role !== "staff" && role !== "member") || !id || !Number.isFinite(expires) || expires < Date.now()) return null;
  if (!equal(signature, await sign(`${role}.${id}.${expiryText}`))) return null;
  return { role, id, expires };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
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
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 120000, hash: "SHA-256" }, base, 256);
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  return equal(await hashPassword(password, salt), expected);
}
