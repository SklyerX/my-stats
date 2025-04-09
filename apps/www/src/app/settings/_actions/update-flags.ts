"use server";

import { getCurrentSession } from "@/auth/session";
import { ALL_FLAGS } from "@/lib/flags";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { users } from "@workspace/database/schema";

export async function updatePrivacyFlagAction(flags: number) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  if (!isValidPrivacyFlag(flags)) {
    throw new Error("Invalid privacy flag value");
  }

  await db
    .update(users)
    .set({
      flags,
    })
    .where(eq(users.id, user.id));
}

function isValidPrivacyFlag(privacyFlag: number) {
  if (typeof privacyFlag !== "number" || Number.isNaN(privacyFlag)) {
    return false;
  }

  if (!Number.isInteger(privacyFlag)) {
    return false;
  }

  if (privacyFlag < 0) {
    return false;
  }

  return (privacyFlag & ALL_FLAGS) === privacyFlag;
}
