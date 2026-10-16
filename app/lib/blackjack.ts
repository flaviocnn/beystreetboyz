export const BLACKJACK_COST = 2;
export type BlackjackStatus = "playing" | "won" | "lost" | "push" | "blackjack";
export type BlackjackHand = { deck: number[]; player: number[]; dealer: number[]; cursor: number; status: BlackjackStatus; payout: number };
export type PublicBlackjackHand = { id: string; player: number[]; dealer: (number | null)[]; playerTotal: number; dealerTotal: number | null;
  status: BlackjackStatus; payout: number; cost: number; version: number };
export type BlackjackState = { balance: number; remaining: number; hand: PublicBlackjackHand | null };
export type BlackjackAction = { requestKey: string; action: "start" } | { requestKey: string; action: "hit" | "stand"; handId: string; version: number };
export const CARD_SUITS = ["♠", "♥", "♣", "♦"];
export function cardFace(card: number) {
  const rank = card % 13 + 1, suit = Math.floor(card / 13);
  return { rank: rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank),
    suit: CARD_SUITS[suit], red: suit === 1 || suit === 3 };
}
export function handValue(cards: number[]) {
  let total = 0, aces = 0;
  for (const card of cards) { const rank = card % 13 + 1; if (rank === 1) { total += 11; aces++; } else total += Math.min(rank, 10); }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
export function dealBlackjack(deck: number[]): BlackjackHand {
  if (deck.length !== 52 || new Set(deck).size !== 52 || deck.some(c => !Number.isInteger(c) || c < 0 || c > 51)) throw new Error("Invalid deck");
  const hand: BlackjackHand = { deck: [...deck], player: [deck[0], deck[2]], dealer: [deck[1], deck[3]], cursor: 4, status: "playing", payout: 0 };
  const playerNatural = handValue(hand.player).total === 21, dealerNatural = handValue(hand.dealer).total === 21;
  if (playerNatural || dealerNatural) {
    hand.status = playerNatural && dealerNatural ? "push" : playerNatural ? "blackjack" : "lost";
    hand.payout = hand.status === "push" ? 2 : hand.status === "blackjack" ? 5 : 0;
  }
  return hand;
}
export function blackjackMove(source: BlackjackHand, action: "hit" | "stand"): BlackjackHand {
  if (source.status !== "playing") throw new Error("Hand already finished");
  const hand = { ...source, player: [...source.player], dealer: [...source.dealer] };
  function draw() { const card = hand.deck[hand.cursor++]; if (card === undefined) throw new Error("Empty deck"); return card; }
  if (action === "hit") {
    hand.player.push(draw());
    if (handValue(hand.player).total > 21) return { ...hand, status: "lost", payout: 0 };
    if (handValue(hand.player).total < 21) return hand;
  }
  // S17: the dealer stands on every 17, including soft 17.
  while (handValue(hand.dealer).total < 17) hand.dealer.push(draw());
  const player = handValue(hand.player).total, dealer = handValue(hand.dealer).total;
  hand.status = dealer > 21 || player > dealer ? "won" : player === dealer ? "push" : "lost";
  hand.payout = hand.status === "won" ? 4 : hand.status === "push" ? 2 : 0;
  return hand;
}
