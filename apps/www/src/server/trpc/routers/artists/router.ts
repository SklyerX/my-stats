import { z } from "zod";
import { publicProcedure, router } from "../../root";
import { db } from "@workspace/database/connection";
import { artists } from "@workspace/database/schema";
import { sql } from "@workspace/database/drizzle";

export const artistsRouter = router({
  getArtistsByGenre: publicProcedure
    .input(z.string())
    .query(async ({ input: genre }) => {
      const artistsFromGenre = await db
        .select()
        .from(artists)
        .where(sql`${artists.genres} @> ARRAY[${genre}]::text[]`)
        .orderBy(sql`${artists.popularity} DESC NULLS LAST`)
        .limit(20);

      return artistsFromGenre;
    }),
});
