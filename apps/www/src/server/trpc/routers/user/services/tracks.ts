import "server-only";

import type { PlaylistContentResponse, PlaylistItem } from "@/types/spotify";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import { SpotifyAPI } from "@/lib/spotify/api";
import { sleep } from "@/lib/utils";

export async function fetchTracksFromSpotify(
  userId: string,
  playlistId: string,
  providedAccessToken?: string,
): Promise<PlaylistItem[]> {
  const accessToken =
    providedAccessToken ?? (await getValidSpotifyToken(userId));
  const spotifyApi = new SpotifyAPI(accessToken);
  const playlistContent = await spotifyApi.getPlaylistContent(playlistId);

  const allContent: Array<PlaylistContentResponse["tracks"]["items"]> = [
    playlistContent.tracks.items,
  ];

  if (playlistContent.tracks.next) {
    await fetchAllPages(playlistContent.tracks.next, accessToken, allContent);
  }

  return allContent.flat();
}

async function fetchAllPages(
  initialNext: string,
  accessToken: string,
  allContent: Array<PlaylistContentResponse["tracks"]["items"]>,
): Promise<void> {
  let next = initialNext;

  while (next) {
    console.log("Fetching next page:", next);
    const req = new Request(next);
    req.headers.set("Authorization", `Bearer ${accessToken}`);
    const res = await fetch(req);

    if (!res.ok) break;

    const data = await res.json();
    const items = data.items || data.tracks?.items;

    if (!items) {
      console.error("Unexpected response structure:", Object.keys(data));
      break;
    }

    allContent.push(items);
    next = data.next || data.tracks?.next;

    if (next) await sleep(1000);
  }
}
