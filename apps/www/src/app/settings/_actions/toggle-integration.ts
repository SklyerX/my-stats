"use server";

import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { and, eq } from "@workspace/database/drizzle";
import { integrations } from "@workspace/database/schema";

export async function toggleIntegrationAction(
  platform: string,
  checked: boolean,
) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  await db
    .update(integrations)
    .set({
      enabled: checked,
    })
    .where(
      and(
        eq(integrations.userId, user.id),
        eq(integrations.platformName, platform.toLowerCase()),
      ),
    );
}
