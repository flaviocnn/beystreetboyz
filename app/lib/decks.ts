import catalog from "./bey-parts.json" with { type: "json" };
import bitTypes from "./bit-types.json" with { type: "json" };

export { catalog };
export const INTEGRATED_RATCHET = "Integrato nella lama";
export type DeckPart = { value: string; custom: boolean };
export type Bey = { blades: DeckPart[]; ratchet: DeckPart; bit: DeckPart };
export type Deck = [Bey, Bey, Bey];
export function bitType(value: string): string | null {
  const key = value.trim().normalize("NFC");
  return Object.hasOwn(bitTypes.types, key) ? (bitTypes.types as Record<string, string>)[key] : null;
}
// User rule: a declared deck's type depends only on its three catalogued bits.
// A custom/unknown bit never inherits a type supplied by a browser payload.
export function attackBitCount(input: unknown): number {
  const deck = parseDeck(input);
  return deck ? deck.filter(bey => bitType(bey.bit.value) === "Attacco").length : 0;
}
export function isFullAttackDeck(input: unknown): boolean {
  return parseDeck(input) !== null && attackBitCount(input) === 3;
}
export function isTopEight(rank: number | null) {
  return Number.isInteger(rank) && rank !== null && rank >= 1 && rank <= 8;
}
const values = {
  blade: new Set(catalog.blades.map(p => p.value)),
  ratchet: new Set([...catalog.ratchets, INTEGRATED_RATCHET]),
  bit: new Set(catalog.bits.map(p => p.value)),
};
function part(input: unknown, kind: keyof typeof values): DeckPart | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;
  if (typeof p.value !== "string" || typeof p.custom !== "boolean") return null;
  const value = p.value.trim().normalize("NFC");
  if (!value || value.length > 100 || /[\u0000-\u001f\u007f<>]/.test(value)) return null;
  if (!p.custom && !values[kind].has(value)) return null;
  return { value, custom: !values[kind].has(value) };
}
export function parseDeck(input: unknown): Deck | null {
  if (!Array.isArray(input) || input.length !== 3) return null;
  const result: Bey[] = [];
  for (const entry of input) {
    if (!entry || typeof entry !== "object" || !Array.isArray(entry.blades) || entry.blades.length < 1 || entry.blades.length > 5) return null;
    const blades: (DeckPart | null)[] = entry.blades.map((p: unknown) => part(p, "blade"));
    const ratchet = part(entry.ratchet, "ratchet"), bit = part(entry.bit, "bit");
    if (blades.some(p => !p) || !ratchet || !bit) return null;
    result.push({ blades: blades as DeckPart[], ratchet, bit });
  }
  return result as Deck;
}
export type PersonalStage = {
  slug: string; name: string; eventDate: string; sourceUrl: string;
  finalRank: number | null; stagePoints: number; swissWins: number; swissLosses: number;
  deck: Deck | null; version: number; updatedAt: string | null; eligible: boolean;
};
