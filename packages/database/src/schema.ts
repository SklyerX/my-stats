import { relations, type SQL, sql } from "drizzle-orm";
import { type AnyPgColumn, unique, varchar } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";
import { boolean } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";
import { bigint } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";
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

export const albums = pgTable("album", {
  id: serial("id").primaryKey(),
  albumId: text("album_id").notNull().unique(),
  name: text("name").notNull(),
  releaseDate: timestamp("release_date").notNull(),
  totalTracks: integer("total_tracks").notNull(),
  albumCover: text("album_cover").notNull(),
  popularity: integer("popularity").notNull(),
  albumType: text("album_type").notNull(),
  tracks: jsonb("album_tracks").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const albumsArtists = pgTable("albums_artists", {
  albumId: text("album_id")
    .notNull()
    .references(() => albums.albumId, {
      onDelete: "cascade",
    }),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.artistId, {
      onDelete: "cascade",
    }),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  trackId: text("track_id").notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  album: text("album").notNull(),
  albumId: text("albumId").notNull(),
  artist: text("artist").notNull(),
  isrc: text("isrc").notNull(),
  imageUrl: varchar("image_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
  popularity: integer("popularity"),
  duration: integer("duration"),
});

export const trackArtists = pgTable(
  "track_artists",
  {
    id: serial("id").primaryKey(),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.trackId, {
        onDelete: "cascade",
      }),
    artistId: text("artist_id").notNull(),
    artistName: varchar("artist_name", { length: 255 }).notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    idx_track_id: index().on(table.trackId),
    idx_artist_id: index().on(table.artistId),
    unique_track_artist: unique("unique_track_artist").on(
      table.trackId,
      table.artistId,
    ),
  }),
);

export const spotifyIdMap = pgTable("spotify_to_mbid_map", {
  id: serial("id").primaryKey(),
  trackId: varchar("trackId", { length: 255 }).notNull().unique(),
  mbid: varchar("mbid", { length: 255 }),
  isrc: varchar("isrc", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const audioFeatures = pgTable(
  "audio_features",
  {
    id: serial("id").primaryKey(),
    spotifyId: varchar("spotify_id", { length: 255 })
      .notNull()
      .unique()
      .references(() => tracks.trackId, {
        onDelete: "cascade",
      }),
    mbid: varchar("mid", { length: 255 }),
    featureData: jsonb("feature_data"),
    available: boolean("available").default(true),
    lastUpdated: timestamp("last_updated", {
      withTimezone: true,
    }).defaultNow(),
    unavailableReason: varchar("unavailable_reason", { length: 50 }),
    lookupAttempts: integer("lookup_attempts").default(1),
    nextLookupAttempt: timestamp("next_lookup_attempt", {
      withTimezone: true,
    }),
  },
  (table) => [
    index().on(table.spotifyId),
    index().on(table.mbid),
    index().on(table.available),
  ],
);

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
  (table) => [
    unique("unique_artist_relationship").on(
      table.artistId,
      table.relatedArtistId,
    ),
  ],
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

export const uploadStatusEnum = pgEnum("upload_status", [
  "queued",
  "processing",
  "completed",
]);

export const userExports = pgTable("user_exports", {
  exportId: text("export_id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  uploadDate: timestamp("upload_date", {
    mode: "date",
  }).defaultNow(),
  fileName: text("file_name").notNull(),
  status: uploadStatusEnum().default("queued"),
});

export const userListeningHistory = pgTable("user_listening_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  totalMs: bigint("total_ms", { mode: "number" }).notNull().default(0),
  timeMessage: varchar("time_message", { length: 255 }).notNull(),
  uniqueArtists: integer("unique_artists").notNull(),
  uniqueTracks: integer("unique_tracks").notNull(),
  listeningHours: integer("listening_hours").notNull(),
  listeningMinutes: integer("listening_minutes").notNull(),
  peakHour: integer("peak_hour").notNull(),
  totalTracks: integer("total_tracks").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userTopArtists = pgTable("user_top_artists", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  historyId: integer("history_id")
    .notNull()
    .references(() => userListeningHistory.id, {
      onDelete: "cascade",
    }),
  artistName: text("artist_name").notNull(),
  artistId: text("artist_id").notNull(),
  rank: integer("rank").notNull(), // #1, #2, etc
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userTopTracks = pgTable("user_top_tracks", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  historyId: integer("history_id")
    .notNull()
    .references(() => userListeningHistory.id, {
      onDelete: "cascade",
    }),
  trackName: text("track_name").notNull(),
  trackId: text("track_id")
    .notNull()
    .references(() => tracks.trackId),
  artistName: text("artist_name").notNull(),
  rank: integer("rank").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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

export const artistsRelations = relations(artists, ({ one, many }) => ({
  stats: one(artistsStats, {
    fields: [artists.id],
    references: [artistsStats.artistId],
  }),
  relatedFrom: many(relatedArtists, { relationName: "artistRelationsFrom" }),
  relatedTo: many(relatedArtists, { relationName: "artistRelationsTo" }),
}));

export const artistsStatsRelations = relations(artistsStats, ({ one }) => ({
  artist: one(artists, {
    fields: [artistsStats.artistId],
    references: [artists.id],
  }),
}));

export const albumsRelations = relations(albums, ({ many }) => ({
  albumsArtists: many(albumsArtists),
}));

export const albumsArtistsRElations = relations(albumsArtists, ({ one }) => ({
  album: one(albums, {
    fields: [albumsArtists.albumId],
    references: [albums.albumId],
  }),
  artist: one(artists, {
    fields: [albumsArtists.artistId],
    references: [artists.artistId],
  }),
}));

export const trackArtistsRelations = relations(trackArtists, ({ one }) => ({
  track: one(tracks, {
    fields: [trackArtists.trackId],
    references: [tracks.trackId],
  }),
  artist: one(artists, {
    fields: [trackArtists.artistId],
    references: [artists.artistId],
  }),
}));

export const relatedArtistsRelations = relations(relatedArtists, ({ one }) => ({
  artist: one(artists, {
    fields: [relatedArtists.artistId],
    references: [artists.id],
    relationName: "artistRelationsFrom",
  }),
  relatedArtist: one(artists, {
    fields: [relatedArtists.relatedArtistId],
    references: [artists.id],
    relationName: "artistRelationsTo",
  }),
}));

export const tracksRelations = relations(tracks, ({ one }) => ({
  audioFeatures: one(audioFeatures, {
    fields: [tracks.trackId],
    references: [audioFeatures.spotifyId],
  }),
  spotifyMap: one(spotifyIdMap, {
    fields: [tracks.trackId],
    references: [spotifyIdMap.trackId],
  }),
}));

export const audioFeaturesRelations = relations(audioFeatures, ({ one }) => ({
  track: one(tracks, {
    fields: [audioFeatures.spotifyId],
    references: [tracks.trackId],
  }),
}));

export const spotifyIdMapRelations = relations(spotifyIdMap, ({ one }) => ({
  track: one(tracks, {
    fields: [spotifyIdMap.trackId],
    references: [tracks.trackId],
  }),
}));

export const userListeningHistoryRelations = relations(
  userListeningHistory,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userListeningHistory.userId],
      references: [users.id],
    }),
    topArtists: many(userTopArtists),
    topTracks: many(userTopTracks),
  }),
);

export const userTopArtistsRelations = relations(userTopArtists, ({ one }) => ({
  history: one(userListeningHistory, {
    fields: [userTopArtists.historyId],
    references: [userListeningHistory.id],
  }),
}));

export const userTopTracksRelations = relations(userTopTracks, ({ one }) => ({
  history: one(userListeningHistory, {
    fields: [userTopTracks.historyId],
    references: [userListeningHistory.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Artists = typeof artists.$inferSelect;
export type RelatedArtists = typeof relatedArtists.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type AudioFeature = typeof audioFeatures.$inferSelect;
export type Albums = typeof albums.$inferSelect;
export type AlbumArtists = typeof albumsArtists.$inferSelect;
export type UserListeningHistory = typeof userListeningHistory.$inferSelect;
export type UserTopArtist = typeof userTopArtists.$inferSelect;
export type UserTopTrack = typeof userTopTracks.$inferSelect;

export function lower(col: AnyPgColumn): SQL {
  return sql`lower(${col})`;
}
