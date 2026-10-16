import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { blackjackActions, blackjackHands } from "../../db/schema";
import { arcadeClock, arcadeRemaining, beycoinBalance, lockBeycoinWallet, type WalletTx } from "./beycoin-wallet";
import { BLACKJACK_COST, blackjackMove, dealBlackjack, handValue, type BlackjackAction, type BlackjackState, type PublicBlackjackHand } from "./blackjack";

export class BlackjackError extends Error {
  status: number;
  constructor(message: string, status = 409) { super(message); this.status = status; }
}
function publicHand(row: typeof blackjackHands.$inferSelect): PublicBlackjackHand {
  return { id: row.id, player: row.player, dealer: row.status === "playing" ? [row.dealer[0], null] : row.dealer,
    playerTotal: handValue(row.player).total, dealerTotal: row.status === "playing" ? null : handValue(row.dealer).total,
    status: row.status, payout: row.payout, cost: row.cost, version: row.version };
}
async function state(tx: WalletTx, memberId: string, day: string): Promise<BlackjackState> {
  const [row] = await tx.select().from(blackjackHands).where(eq(blackjackHands.memberId, memberId))
    .orderBy(desc(sql`${blackjackHands.status} = 'playing'`), desc(blackjackHands.createdAt), desc(blackjackHands.id)).limit(1);
  return { hand: row ? publicHand(row) : null, balance: await beycoinBalance(tx, memberId), remaining: await arcadeRemaining(tx, memberId, day) };
}
export async function blackjackState(memberId: string) {
  return getDb().transaction(async tx => { await lockBeycoinWallet(tx, memberId); return state(tx, memberId, (await arcadeClock(tx)).day); });
}
export async function playBlackjack(memberId: string, input: BlackjackAction) {
  return getDb().transaction(async tx => {
    await lockBeycoinWallet(tx, memberId);
    const clock = await arcadeClock(tx), now = new Date(clock.now);
    const [old] = await tx.select().from(blackjackActions).where(and(eq(blackjackActions.memberId, memberId), eq(blackjackActions.requestKey, input.requestKey)));
    if (old) {
      if (old.action !== input.action || (input.action !== "start" && (old.handId !== input.handId || old.expectedVersion !== input.version))) throw new BlackjackError("Riapri il tavolo e riprova.", 400);
      return state(tx, memberId, clock.day);
    }
    let handId: string;
    if (input.action === "start") {
      const [active] = await tx.select({ id: blackjackHands.id }).from(blackjackHands).where(and(eq(blackjackHands.memberId, memberId), eq(blackjackHands.status, "playing"))).limit(1);
      if (active) throw new BlackjackError("Hai già una mano in corso. Continua quella partita.");
      if (!await arcadeRemaining(tx, memberId, clock.day)) throw new BlackjackError("Hai giocato tutte le partite di oggi. Torna domani!", 429);
      if (await beycoinBalance(tx, memberId) < BLACKJACK_COST) throw new BlackjackError("Servono 2 Beycoin per sederti al tavolo.");
      const deck = Array.from({ length: 52 }, (_, i) => i);
      for (let i = 51; i > 0; i--) { const j = randomInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      const dealt = dealBlackjack(deck); handId = randomUUID();
      await tx.insert(blackjackHands).values({ id: handId, memberId, ...dealt, cost: BLACKJACK_COST,
        gameDay: clock.day, createdAt: now, finishedAt: dealt.status === "playing" ? null : now });
    } else {
      const [row] = await tx.select().from(blackjackHands).where(and(eq(blackjackHands.id, input.handId), eq(blackjackHands.memberId, memberId)));
      if (!row || row.status !== "playing" || row.version !== input.version) throw new BlackjackError("La mano è cambiata. Aggiorna il tavolo per continuare.");
      handId = row.id;
      const next = blackjackMove(row, input.action);
      await tx.update(blackjackHands).set({ player: next.player, dealer: next.dealer, cursor: next.cursor, status: next.status,
        payout: next.payout, version: row.version + 1, finishedAt: next.status === "playing" ? null : now }).where(eq(blackjackHands.id, row.id));
    }
    await tx.insert(blackjackActions).values({ memberId, requestKey: input.requestKey, handId, action: input.action,
      expectedVersion: input.action === "start" ? null : input.version, createdAt: now });
    return state(tx, memberId, clock.day);
  });
}
