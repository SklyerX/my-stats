"use server";

import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { and, eq } from "@workspace/database/drizzle";
import { integrations } from "@workspace/database/schema";
import { revalidatePath } from "next/cache";

export async function disconnectPlatformAction(platform: string) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.userId, user.id),
        eq(integrations.platformName, platform.toLowerCase()),
      ),
    );

  revalidatePath("/settings/integrations");
}
