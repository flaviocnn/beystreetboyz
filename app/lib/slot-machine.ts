// Shared, versioned rules. Payouts INCLUDE the stake; no real-money value.
export const SLOT_COST = 1;
export const SLOT_DAILY_LIMIT = 20;
export const SLOT_COOLDOWN_MS = 2000;
export const SLOT_SYMBOLS = [
  { name: "Beyblade", mark: "◉", color: "#8ed5e8" },
  { name: "Fenice", mark: "✦", color: "#ffb775" },
  { name: "Lama", mark: "◆", color: "#b5b0ff" },
  { name: "Grifone", mark: "♜", color: "#ffdf81" },
] as const;
export type SlotReels = [number, number, number];
export type SlotSpin = { id: string; reels: SlotReels; cost: number; payout: number; createdAt: string };
export type SlotState = { balance: number; remaining: number; availableAt: string | null; history: SlotSpin[] };
export type SlotResponse = SlotState & { spin: SlotSpin };
export function slotPayout(reels: SlotReels): number {
  if (reels.some(value => !Number.isInteger(value) || value < 0 || value >= SLOT_SYMBOLS.length)) throw new Error("Invalid reels");
  const [a, b, c] = reels;
  return a === b && b === c ? a === 3 ? 12 : 4 : a === b || b === c || a === c ? 1 : 0;
}
export function validSlotKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
