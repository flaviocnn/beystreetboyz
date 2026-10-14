import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fiscalCode: text("fiscal_code").notNull().unique(),
  documentNumber: text("document_number").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  challongeUsername: text("challonge_username"),
  challongeId: text("challonge_id"),
  membershipStatus: text("membership_status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentPaid: integer("payment_paid", { mode: "boolean" }).notNull().default(false),
  feeCents: integer("fee_cents"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  authVersion: integer("auth_version").notNull().default(0),
  avatarStyle: integer("avatar_style").notNull().default(0),
  avatarColor: integer("avatar_color").notNull().default(0),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  score: integer("score").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const guildMessages = sqliteTable("guild_messages", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  day: text("day").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("guild_messages_member_day_unique").on(table.memberId, table.day)]);
