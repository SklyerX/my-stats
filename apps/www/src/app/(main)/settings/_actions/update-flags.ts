"use server";

import { getCurrentSession } from "@/auth/session";
import { ALL_FLAGS } from "@/lib/flags";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { users } from "@workspace/database/schema";

export async function updatePrivacyFlagAction(flags: number) {
  console.log("Entering flag thingy");
  const { session, user } = await getCurrentSession();

  console.log(`Flags received ${flags}`);

  if (!session || !user) throw new Error("Unauthorized");
  console.log(
    `sessions found -> is valid flags? -> ${isValidPrivacyFlag(flags)}`,
  );

  if (!isValidPrivacyFlag(flags)) {
    throw new Error("Invalid privacy flag value");
  }

  console.log(`Updating for ${user.id}`);

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
