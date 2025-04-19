import { SpotifyAPI } from "@/lib/spotify/api";
import { getValidSpotifyToken } from "@/lib/spotify/tokens";
import { logger } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import {
  syncedPlays,
  userListeningHistory,
  users,
  webhookLogs,
} from "@workspace/database/schema";

import { schedules } from "@trigger.dev/sdk/v3";
import { processMultipleMilestones } from "@/lib/milestone-service";
import { sendWebhook } from "@/lib/webhooks";
import { decrypt } from "@/lib/encryption";

export const syncStreamsTask = schedules.task({
  id: "sync-streams",
  run: async (payload) => {
    if (!payload.externalId) throw new Error("externalId is required");

    const existingUser = await db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.id, payload.externalId as string),
      with: {
        history: {
          limit: 1,
          orderBy: (fields, { asc }) => asc(fields.createdAt),
        },
        webhook: true,
      },
    });

    if (!existingUser) return logger.error("User not found");

    const accessToken = await getValidSpotifyToken(payload.externalId);
    const spotifyApi = new SpotifyAPI(accessToken);

    const recentlyPlayed = await spotifyApi.getRecentlyPlayed(null, null, 50);
    if (!recentlyPlayed || recentlyPlayed.length === 0) {
      return logger.info("Failed to get recently played");
    }

    const lastSyncedAt = existingUser.lastSyncedAt
      ? new Date(existingUser.lastSyncedAt)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newPlays = recentlyPlayed.filter(
      (play) => new Date(play.played_at).getTime() > lastSyncedAt.getTime(),
    );

    if (newPlays.length === 0) {
      return logger.info("No new plays since last sync");
    }

    const data = newPlays.map((recentlyPlayed) => ({
      albumId: recentlyPlayed.track.album.id,
      albumName: recentlyPlayed.track.album.name,
      artist: recentlyPlayed.track.artists.at(0)?.name ?? "N/A",
      artistId: recentlyPlayed.track.artists.at(0)?.id ?? "N/A",
      durationMs: recentlyPlayed.track.duration_ms,
      playedAt: new Date(recentlyPlayed.played_at),
      syncedAt: new Date(),
      trackId: recentlyPlayed.track.id,
      trackName: recentlyPlayed.track.name,
      userId: existingUser.id,
    }));

    const newTotalMs = data.reduce(
      (acc, current) => acc + current.durationMs,
      0,
    );
    const newPlaysCount = data.length;

    await db.batch([
      db.insert(syncedPlays).values(data),
      db
        .update(users)
        .set({ lastSyncedAt: new Date() })
        .where(eq(users.id, existingUser.id)),
      db
        .update(userListeningHistory)
        .set({
          totalMs: (existingUser.history.at(0)?.totalMs || 0) + newTotalMs,
          totalTracks:
            (existingUser.history.at(0)?.totalTracks || 0) + newPlaysCount,
        })
        .where(eq(userListeningHistory.userId, existingUser.id)),
    ]);

    const currentTotalMinutes = Math.floor(
      ((existingUser.history.at(0)?.totalMs || 0) + newTotalMs) / 60000,
    );
    const currentTotalPlays =
      (existingUser.history.at(0)?.totalTracks || 0) + newPlaysCount;

    const milestonesCreated = await processMultipleMilestones(existingUser.id, [
      {
        currentValue: currentTotalMinutes,
        entityType: "global",
        milestoneType: "minutes",
        entityId: "",
      },
      {
        currentValue: currentTotalPlays,
        entityType: "global",
        milestoneType: "plays",
        entityId: "",
      },
    ]);

    if (existingUser.webhook) {
      const secret = decrypt(
        existingUser.webhook.webhook_secret.data,
        existingUser.webhook.webhook_secret.iv,
        existingUser.webhook.webhook_secret.tag,
      );

      const result = await sendWebhook({
        payload: {
          eventType: "milestone.achieved",
          timestamp: new Date().toISOString(),
          data: {
            userId: existingUser.id,
            username: existingUser.username,
            metadata: {
              calculatedFrom: "sync-streams",
            },
          },
        },
        secret,
        url: existingUser.webhook.url,
      });

      await db.insert(webhookLogs).values({
        status: result.isError ? "failed" : "success",
        webhookId: existingUser.webhook.id,
        requestData: result.request,
        responseData: result.response,
        metadata: {
          for: "milestone",
          value: milestonesCreated.length.toString(),
          event: "milestone.achieved",
          user: existingUser.username,
          displayName: `${milestonesCreated.length} Milestone(s) achieved!`,
        },
      });
    }

    logger.info(
      `Sync complete. Created ${milestonesCreated.length} new milestones.`,
    );
  },
});
