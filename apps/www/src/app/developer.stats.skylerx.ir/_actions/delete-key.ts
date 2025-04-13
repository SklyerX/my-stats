"use server";

import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { and, eq } from "@workspace/database/drizzle";
import { apiKeys } from "@workspace/database/schema";
import { revalidatePath } from "next/cache";

export async function deleteKeyAction(keyId: string) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.id, keyId)));

  revalidatePath("/keys");
}
