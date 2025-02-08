import { text } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
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
