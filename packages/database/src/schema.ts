import { relations } from "drizzle-orm";
import { serial } from "drizzle-orm/pg-core";
import { text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  spotifyId: text("spotify_id").notNull().unique(),
  slug: text().notNull().unique(),
  email: text().notNull().unique(),
  image: text("image"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: text("access_token").notNull(),
  accessTokenIv: text("token_iv").notNull(),
  accessTokenTag: text("access_token_tag").notNull(),
  refreshToken: text("refresh_token").notNull(),
  refreshTokenIv: text("refresh_token_iv").notNull(),
  refreshTokenTag: text("refresh_token_tag").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const userRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  tokens: one(tokens, {
    fields: [users.id],
    references: [tokens.userId],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const tokensRelations = relations(tokens, ({ one }) => ({
  user: one(users, {
    fields: [tokens.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
