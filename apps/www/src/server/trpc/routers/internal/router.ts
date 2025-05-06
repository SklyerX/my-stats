import { env } from "@/env";
import { publicProcedure, router } from "../../root";
import { TRPCError } from "@trpc/server";
import type { Activity, CommitResponse } from "./types";
import { redis } from "@/lib/redis";
import { CACHE_KEYS, CACHE_TIMES } from "@/lib/constants";

export const internalRouter = router({
  getCommits: publicProcedure.query(async () => {
    const cacheKey = CACHE_KEYS.commits();
    const cache = await redis.get(cacheKey);

    if (cache) return cache as Activity[];

    const request = new Request(
      "https://api.github.com/repos/sklyerx/bkmrks/commits",
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
});
