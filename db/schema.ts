import { sql } from "drizzle-orm";
import type { Deck } from "../app/lib/decks";
import { boolean, check, date, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
  role: text("role").notNull().default("member"),
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

export const checkinEvents = pgTable("checkin_events", {
  id: text("id").primaryKey(), tournamentId: text("tournament_id").notNull().unique(),
  tournamentRef: text("tournament_ref").notNull(), sourceUrl: text("source_url").notNull(),
  name: text("name").notNull(), eventDate: date("event_date").notNull(), feeCents: integer("fee_cents").notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
  revision: integer("revision").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const checkinParticipants = pgTable("checkin_participants", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull().references(() => checkinEvents.id),
  participantId: text("participant_id").notNull(), displayName: text("display_name").notNull(), challongeUsername: text("challonge_username"),
  memberId: text("member_id").references(() => members.id, { onDelete: "set null" }), registered: boolean("registered").notNull().default(true),
  presence: text("presence").notNull().default("pending"), paymentStatus: text("payment_status").notNull().default("unpaid"),
  paidCents: integer("paid_cents"), paymentMethod: text("payment_method"), paidAt: timestamp("paid_at", { withTimezone: true }), paidBy: text("paid_by"),
  version: integer("version").notNull().default(0),
}, t => [uniqueIndex("checkin_participant_once").on(t.eventId, t.participantId), uniqueIndex("checkin_member_once").on(t.eventId, t.memberId).where(sql`${t.memberId} IS NOT NULL`),
  check("checkin_complete_payment", sql`${t.paymentStatus} <> 'paid' OR (${t.paidCents} IS NOT NULL AND ${t.paidCents} >= 0)`)]);
export const checkinAudit = pgTable("checkin_audit", {
  id: text("id").primaryKey(), eventId: text("event_id").notNull().references(() => checkinEvents.id),
  participantId: text("participant_id").notNull().references(() => checkinParticipants.id), action: text("action").notNull(),
  actorId: text("actor_id").notNull(), operatorLabel: text("operator_label").notNull(), note: text("note").notNull(),
  beforeState: jsonb("before_state").notNull(), afterState: jsonb("after_state").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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

export const stageDecks = pgTable("stage_decks", {
  stageSlug: text("stage_slug").notNull().references(() => tournamentStages.slug, { onDelete: "cascade" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  beys: jsonb("beys").$type<Deck>().notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.stageSlug, table.memberId] })]);
