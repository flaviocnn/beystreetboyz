import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fiscalCode: text("fiscal_code").notNull(),
  documentNumber: text("document_number").notNull(),
  email: text("email").notNull().unique(),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
  score: integer("score").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
