import { relations, type SQL, sql } from "drizzle-orm";
import { type AnyPgColumn, unique, varchar } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
import { numeric } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
import { serial } from "drizzle-orm/pg-core";
import { text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  spotifyId: text("spotify_id").notNull().unique(),
  slug: text().notNull().unique(),
  username: varchar("username", { length: 30 }).notNull(),
  bio: varchar("bio", { length: 150 }),
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

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  artistId: text("artist_id").notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  genres: text("genres").array().notNull().default([]),
  imageUrl: varchar("image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
  popularity: integer("popularity"),
  followerAmount: integer("follower_amount"),
});

export const artistsStats = pgTable("artists_stats", {
  artistId: text("artist_id")
    .primaryKey()
    .references(() => artists.id),
  topTracks: jsonb().notNull(),
  topAlbums: jsonb().notNull(),
  lastUpdated: timestamp().notNull().defaultNow(),
});

export const relatedArtists = pgTable(
  "related_artists",
  {
    id: serial("id").primaryKey(),
    artistId: text("artist_id")
      .notNull()
      .references(() => artists.id),
    relatedArtistId: text("related_artist_id")
      .notNull()
      .references(() => artists.id),
    matchScore: numeric("match_score", { precision: 5, scale: 2 }).notNull(),
    source: varchar("source", { length: 50 }).notNull().default("lastfm"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueRelationship: unique("unique_artist_relationship").on(
      table.artistId,
      table.relatedArtistId,
    ),
  }),
);

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
export type Artists = typeof artists.$inferSelect;
export type RelatedArtists = typeof relatedArtists.$inferSelect;

export function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}
