"use server";

import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { users } from "@workspace/database/schema";
import { redirect } from "next/navigation";

export async function deleteAccountAction() {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  await db.delete(users).where(eq(users.id, user.id));

  redirect("/");
}
