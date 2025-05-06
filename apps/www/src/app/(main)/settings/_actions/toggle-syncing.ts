"use server";

import { getCurrentSession } from "@/auth/session";
import { syncStreamsTask } from "@/trigger/sync-steams";
import { schedules } from "@trigger.dev/sdk/v3";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { users } from "@workspace/database/schema";
import { revalidatePath } from "next/cache";

export async function toggleSyncingAction(enabled: boolean) {
  try {
    const { session, user } = await getCurrentSession();

    if (!session || !user) throw new Error("Unauthorized");

    let syncId = user.sync_id;
    const wasEnabled = user.sync_enabled;

    if (!syncId && enabled) {
      const schedule = await schedules.create({
        task: syncStreamsTask.id,
        cron: "0 * * * *",
        externalId: user.id,
        deduplicationKey: `${user.id}-sync`,
      });
      syncId = schedule.id;
    }

    if (enabled && !wasEnabled && syncId) {
      await schedules.activate(syncId);
    } else if (!enabled && wasEnabled && syncId) {
      await schedules.deactivate(syncId);
    }

    await db
      .update(users)
      .set({
        sync_enabled: enabled,
        sync_id: syncId,
      })
      .where(eq(users.id, user.id));

    revalidatePath("/settings/import");
    return { success: true };
  } catch (error) {
    console.error("Error in toggleSyncingAction:", error);
    throw error;
  }
}
