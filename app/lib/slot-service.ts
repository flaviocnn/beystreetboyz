import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { beycoinSlotSpins } from "../../db/schema";
import { beycoinBalance, lockBeycoinWallet, type WalletTx } from "./beycoin-wallet";
import { SLOT_COST, SLOT_COOLDOWN_MS, SLOT_DAILY_LIMIT, slotPayout, type SlotReels, type SlotSpin, type SlotState } from "./slot-machine";

export class SlotError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function serialize(row: typeof beycoinSlotSpins.$inferSelect): SlotSpin {
  return { id: row.id, reels: row.reels, cost: row.cost, payout: row.payout, createdAt: row.createdAt.toISOString() };
}
async function readClock(tx: WalletTx) {
  // One DB-clock snapshot per request, including a spin that straddles midnight.
  const [clock] = await tx.execute<{ now: string; day: string }>(sql`SELECT instant AS now,
    (instant AT TIME ZONE 'Europe/Rome')::date::text AS day FROM (SELECT clock_timestamp() AS instant) clock`);
  return clock;
}
async function state(tx: WalletTx, memberId: string, day: string): Promise<SlotState> {
  const balance = await beycoinBalance(tx, memberId);
  const [today] = await tx.execute<{ count: number }>(sql`SELECT count(*)::integer AS count FROM beycoin_slot_spins
    WHERE member_id = ${memberId} AND game_day = ${day}::date`);
  const history = await tx.select().from(beycoinSlotSpins).where(eq(beycoinSlotSpins.memberId, memberId))
    .orderBy(desc(beycoinSlotSpins.createdAt), beycoinSlotSpins.id).limit(10);
  return { balance, remaining: Math.max(0, SLOT_DAILY_LIMIT - today.count),
    availableAt: history[0] ? new Date(history[0].createdAt.getTime() + SLOT_COOLDOWN_MS).toISOString() : null, history: history.map(serialize) };
}
export async function slotState(memberId: string) {
  return getDb().transaction(async tx => { await lockBeycoinWallet(tx, memberId); return state(tx, memberId, (await readClock(tx)).day); });
}
export async function playSlot(memberId: string, requestKey: string) {
  return getDb().transaction(async tx => {
    await lockBeycoinWallet(tx, memberId);
    const clock = await readClock(tx);
    const [existing] = await tx.select().from(beycoinSlotSpins).where(and(eq(beycoinSlotSpins.memberId, memberId), eq(beycoinSlotSpins.requestKey, requestKey)));
    // Replay BEFORE limits/balance checks. A lost response never costs a second stake.
    if (existing) return { ...await state(tx, memberId, clock.day), spin: serialize(existing) };
    const current = await state(tx, memberId, clock.day);
    const now = new Date(clock.now);
    if (current.remaining === 0) throw new SlotError("Hai giocato tutti i giri di oggi. Torna domani!", 429);
    if (current.availableAt && new Date(current.availableAt).getTime() > now.getTime()) throw new SlotError("Attendi due secondi tra un giro e il successivo.", 429);
    if (current.balance < SLOT_COST) throw new SlotError("Non hai abbastanza Beycoin. Le imprese della Gilda ti permettono di guadagnarne.", 409);
    const reels: SlotReels = [randomInt(4), randomInt(4), randomInt(4)];
    const [spin] = await tx.insert(beycoinSlotSpins).values({ id: randomUUID(), memberId, requestKey, reels,
      cost: SLOT_COST, payout: slotPayout(reels), gameDay: clock.day, createdAt: now }).returning();
    return { ...await state(tx, memberId, clock.day), spin: serialize(spin) };
  });
}
