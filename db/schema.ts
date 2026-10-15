import { sql } from "drizzle-orm";
import { boolean, date, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  fiscalCode: text("fiscal_code").unique(),
  documentNumber: text("document_number"),
  email: text("email").unique(),
  phone: text("phone"),
  challongeUsername: text("challonge_username"),
  challongeId: text("challonge_id"),
  membershipStatus: text("membership_status").notNull().default("unknown"),
  paymentMethod: text("payment_method"),
  paymentPaid: boolean("payment_paid"),
  feeCents: integer("fee_cents"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  authVersion: integer("auth_version").notNull().default(0),
  avatarStyle: integer("avatar_style").notNull().default(0),
  avatarColor: integer("avatar_color").notNull().default(0),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  score: integer("score").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, table => [uniqueIndex("members_challonge_username_unique").on(sql`lower(${table.challongeUsername})`).where(sql`${table.challongeUsername} IS NOT NULL`)]);

export const guildMessages = pgTable("guild_messages", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  day: text("day").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("guild_messages_member_day_unique").on(table.memberId, table.day)]);

export const challongeIdentities = pgTable("challonge_identities", {
  challongeId: text("challonge_id").primaryKey(),
  memberId: text("member_id").notNull().unique().references(() => members.id, { onDelete: "cascade" }),
});

export const oauthAttempts = pgTable("oauth_attempts", {
  stateHash: text("state_hash").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const tournamentStages = pgTable("tournament_stages", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  eventDate: date("event_date").notNull(),
  sourceUrl: text("source_url").notNull(),
  attendance: integer("attendance").notNull(),
  coefficientMilli: integer("coefficient_milli").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tournamentResults = pgTable("tournament_results", {
  stageSlug: text("stage_slug").notNull().references(() => tournamentStages.slug, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  displayName: text("display_name").notNull(),
  challongeUsername: text("challonge_username"),
  sourceChallongeUsername: text("source_challonge_username"),
  memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
  groupName: text("group_name"),
  swissWins: integer("swiss_wins").notNull(),
  swissLosses: integer("swiss_losses").notNull(),
  finalRank: integer("final_rank"),
  basePoints: integer("base_points").notNull(),
  stagePoints: integer("stage_points").notNull(),
}, table => [primaryKey({ columns: [table.stageSlug, table.sourceKey] }), uniqueIndex("tournament_results_member_stage").on(table.stageSlug, table.memberId)]);
