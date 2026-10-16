import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { checkinEvents as events, checkinParticipants as payments } from "../../db/schema";

// The paid check-in record IS the receipt. Never create a second money source
// that could diverge from the atomic/versioned payment + audit transaction.
export async function treasuryOverview(eventId: string | null, page: number) {
  return getDb().transaction(async tx => {
    const amountFor = (method: string) => sql<number>`coalesce(sum(case when ${payments.paymentStatus} = 'paid' and ${payments.paymentMethod} = ${method} then ${payments.paidCents} else 0 end), 0)`.mapWith(Number);
    const rows = await tx.select({ id: events.id, name: events.name, eventDate: events.eventDate, feeCents: events.feeCents,
      receipts: sql<number>`count(case when ${payments.paymentStatus} = 'paid' then 1 end)`.mapWith(Number),
      totalCents: sql<number>`coalesce(sum(case when ${payments.paymentStatus} = 'paid' then ${payments.paidCents} else 0 end), 0)`.mapWith(Number),
      cashCents: amountFor("cash"), cardCents: amountFor("card"), bankCents: amountFor("bank"), otherCents: amountFor("other"),
    }).from(events).leftJoin(payments, eq(payments.eventId, events.id)).groupBy(events.id).orderBy(desc(events.eventDate), events.id);
    const summary = rows.reduce((total, row) => ({ totalCents: total.totalCents + row.totalCents, receipts: total.receipts + row.receipts,
      cashCents: total.cashCents + row.cashCents, cardCents: total.cardCents + row.cardCents, bankCents: total.bankCents + row.bankCents, otherCents: total.otherCents + row.otherCents,
    }), { totalCents: 0, receipts: 0, cashCents: 0, cardCents: 0, bankCents: 0, otherCents: 0 });
    const where = and(eq(payments.paymentStatus, "paid"), eventId ? eq(payments.eventId, eventId) : undefined);
    const [count] = await tx.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(payments).where(where);
    const receipts = await tx.select({ id: payments.id, eventId: events.id, eventName: events.name, eventDate: events.eventDate,
      displayName: payments.displayName, challongeUsername: payments.challongeUsername, amountCents: payments.paidCents,
      method: payments.paymentMethod, paidAt: payments.paidAt, operator: payments.paidBy, presence: payments.presence, registered: payments.registered,
    }).from(payments).innerJoin(events, eq(events.id, payments.eventId)).where(where)
      .orderBy(desc(payments.paidAt), payments.id).limit(50).offset((page - 1) * 50);
    return { events: rows, summary, receipts, page, pageSize: 50, receiptCount: count.n, filterEventId: eventId ?? "", updatedAt: new Date().toISOString() };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
