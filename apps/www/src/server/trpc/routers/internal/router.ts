import { env } from "@/env";
import { publicProcedure, router } from "../../root";
import { TRPCError } from "@trpc/server";
import type { Activity, CommitResponse } from "./types";
import { redis } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";
import { z } from "zod";
import { db } from "@workspace/database/connection";
import {
  type Albums,
  type Artists,
  type Track,
  type User,
  albums,
  artists,
  tracks,
  users,
} from "@workspace/database/schema";
import { like, or } from "@workspace/database/drizzle";
import { SpotifyAPI } from "@/lib/spotify/api";
import { getSystemAccessToken } from "@/lib/spotify/system";
import type {
  Track as SpotifyTrack,
  Artist as SpotifyArtist,
  Album as SpotifyAlbum,
} from "@/types/spotify";

export const internalRouter = router({
  getCommits: publicProcedure.query(async () => {
    const cacheKey = CACHE_KEYS.commits();
    const cache = await redis.get(cacheKey);

    if (cache) return cache as Activity[];

    const request = new Request(
      "https://api.github.com/repos/sklyerx/my-stats/commits",
    );

    request.headers.append("Accept", "application/vnd.github+json");
    request.headers.append("X-GitHub-Api-Version", "2022-11-28");
    request.headers.append(
      "Authorization",
      `Bearer ${env.GITHUB_DEVELOPER_KEY}`,
    );

    const res = await fetch(request);

    if (!res.ok)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to fetch commits from GitHub",
      });

    const data = (await res.json()) as CommitResponse[];

    const commits = data.map((commit) => {
      const shortSha = commit.sha?.substring(0, 7) || "";

      const message = commit.commit?.message || "";
      const firstLine = message.split("\n")[0];

      let type = "push";

      if (message.startsWith("Merge")) {
        type = "merge";
      } else if (message.includes("Delete") || message.includes("Remove")) {
        type = "deleted";
      }

      const repoPath =
        commit.url?.split("/repos/")[1]?.split("/commits")[0] || "unknown/repo";

      const activity: Activity = {
        type,
        hash: shortSha,
        action: "to",
        repo: repoPath,
        message: firstLine,
        time: new Date(commit.commit?.author?.date || Date.now()),
        avatar: commit.author?.avatar_url || "/api/placeholder/24/24",
      };

      if (type === "merged") {
        const prMatch = message.match(/#(\d+)/);
        if (prMatch) {
          activity.prType = "pr";
          activity.prNumber = prMatch[1];

          const branchMatch = message.match(/from\s+([^\s]+)/);
          activity.via = branchMatch ? branchMatch[1] : "branch";
          activity.action = "on";

          activity.hash = undefined;
        }
      }

      if (type === "deleted") {
        const branchMatch = message.match(
          /[Dd]elete(?:d)?\s+(?:branch)?\s+([^\s]+)/,
        );
        activity.branch = branchMatch ? branchMatch[1] : shortSha;
        activity.action = "from";
        activity.hash = undefined;
      }

      return activity;
    });

    await redis.set(cacheKey, commits, {
      ex: CACHE_TIMES.commits,
    });

    return commits;
  }),
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input: { query } }) => {
      const cacheKey = CACHE_KEYS.search(query);
      const cache = await redis.get(cacheKey);

      await redis.zincrby("popular_searches", 1, query);

      if (cache)
        return cache as Promise<{
          artists: Artists[];
          albums: Albums[];
          tracks: Track[];
          users: User[];
        }>;

      const searchPattern = `%${query}%`;

      const {
        "0": artistsResults,
        "1": albumsResults,
        "2": tracksResults,
        "3": usersResults,
      } = await db.batch([
        db
          .select()
          .from(artists)
          .where(like(artists.name, searchPattern))
          .limit(15),
        db
          .select()
          .from(albums)
          .where(like(albums.name, searchPattern))
          .limit(15),
        db
          .select()
          .from(tracks)
          .where(like(tracks.name, searchPattern))
          .limit(15),
        db
          .select()
          .from(users)
          .where(
            or(
              like(users.username, searchPattern),
              like(users.slug, searchPattern),
            ),
          )
          .limit(15),
      ]);

      const data = {
        artists: artistsResults,
        albums: albumsResults,
        tracks: tracksResults,
        users: usersResults,
      };

      const searchCount = (await redis.zscore("popular_searches", query)) || 0;

      let cacheTTL = CACHE_TIMES.search;

      if (searchCount > 100)
        // Default 2 hours
        cacheTTL = 14400;
      if (searchCount > 500)
        // 4 hours for popular searches
        cacheTTL = 28800; // 8 hours for very popular searches

      await redis.set(cacheKey, data, {
        ex: cacheTTL,
      });

      return data;
    }),
  spotifySearch: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input: { query } }) => {
      const cacheKey = CACHE_KEYS.spotifySearch(query);
      const cache = await redis.get(cacheKey);

      if (cache)
        return cache as Promise<{
          artists: SpotifyArtist[];
          albums: SpotifyAlbum[];
          tracks: SpotifyTrack[];
        }>;

      const accessToken = await getSystemAccessToken();

      const spotifyApi = new SpotifyAPI(accessToken);

      const searchResults = await spotifyApi.searchAll(
        query,
        ["track", "artist", "album"],
        {
          limit: 15,
        },
      );

      const data = {
        artists: searchResults.artists?.items
          ? searchResults.artists?.items
          : [],
        albums: searchResults.albums?.items ? searchResults.albums?.items : [],
        tracks: searchResults.tracks?.items ? searchResults.tracks?.items : [],
      };

      await redis.set(cacheKey, data, {
        ex: CACHE_TIMES.spotifySearch,
      });

      return data;
    }),
});
