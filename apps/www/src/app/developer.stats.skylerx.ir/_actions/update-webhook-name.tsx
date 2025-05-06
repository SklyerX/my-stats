"use server";

import { getCurrentSession } from "@/auth/session";
import { webhookNameSchema } from "@/lib/validators/webhook";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { webhooks } from "@workspace/database/schema";
import { revalidatePath } from "next/cache";

export async function updateWebhookNameAction(inputName: string) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  try {
    const name = webhookNameSchema.parse(inputName);

    await db
      .update(webhooks)
      .set({
        name,
      })
      .where(eq(webhooks.userId, user.id));

    revalidatePath("/webhooks");
  } catch (err) {
    console.error(err);
    throw err;
  }
}
