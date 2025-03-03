"use server";

import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import { db } from "@workspace/database/connection";
import { artists } from "@workspace/database/schema";

export async function createSpotifyArtistEntry(artistId: string) {
  console.log("Creating Spotify Artist Entry for", artistId);
  const accessToken = await getSystemAccessToken();
  console.log("access token granted");

  const spotifyApi = new SpotifyAPI(accessToken);
  console.log("fetching artist");
  const spotifyArtist = await spotifyApi.getArtist(artistId);
  console.log("fetched artist, storing...", spotifyArtist.name);

  const [createdArtist] = await db
    .insert(artists)
    .values({
      artistId: spotifyArtist.id,
      name: spotifyArtist.name,
      imageUrl: spotifyArtist.images[0]?.url,
      genres: spotifyArtist.genres,
      popularity: spotifyArtist.popularity,
      followerAmount: spotifyArtist.followers.total,
    })
    .returning()
    .onConflictDoNothing();

  console.log("done storing");

  return createdArtist;
}
