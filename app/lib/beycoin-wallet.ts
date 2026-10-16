import "server-only";
import { sql } from "drizzle-orm";
import type { getDb } from "../../db";
import type { BeycoinMovement } from "./achievements";
export type WalletTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

// Keep the existing achievement lock namespace: spending and rewards serialize together.
export async function lockBeycoinWallet(tx: WalletTx, memberId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"achievements:" + memberId}, 0))`);
}
export async function beycoinBalance(tx: WalletTx, memberId: string): Promise<number> {
  const [row] = await tx.execute<{ balance: number }>(sql`SELECT (
    coalesce((SELECT sum(amount) FROM beycoin_ledger WHERE member_id = ${memberId}), 0) +
    coalesce((SELECT sum(payout - cost) FROM beycoin_slot_spins WHERE member_id = ${memberId}), 0)
  )::integer AS balance`);
  return row.balance;
}
export async function beycoinHistory(tx: WalletTx, memberId: string): Promise<BeycoinMovement[]> {
  const rows = await tx.execute<{ id: string; achievementId: BeycoinMovement["achievementId"]; amount: number; reason: string; createdAt: string }>(sql`
    SELECT id, achievement_id AS "achievementId", amount, reason, created_at AS "createdAt" FROM (
      SELECT id, achievement_id, amount, reason, created_at FROM beycoin_ledger WHERE member_id = ${memberId}
      UNION ALL
      SELECT id, NULL AS achievement_id, payout - cost AS amount, 'slot' AS reason, created_at
      FROM beycoin_slot_spins WHERE member_id = ${memberId}
    ) movements ORDER BY created_at DESC, id DESC LIMIT 50`);
  return rows.map(row => ({ ...row, createdAt: new Date(row.createdAt).toISOString() }));
}
