"use server";

import { getCurrentSession } from "@/auth/session";
import { encrypt } from "@/lib/encryption";
import {
  webhookFormSchema,
  type WebhookFormSchema,
} from "@/lib/validators/webhook";
import { db } from "@workspace/database/connection";
import { webhooks } from "@workspace/database/schema";

// biome-ignore lint/style/useNodejsImportProtocol: Cannot use node prefix in edge env
import { randomBytes } from "crypto";

export async function registerWebhookAction(data: WebhookFormSchema) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  try {
    const { name, url } = webhookFormSchema.parse(data);

    const secret = randomBytes(32).toString("hex");
    const { encryptedData, iv, tag } = encrypt(secret);

    await db.insert(webhooks).values({
      name,
      url,
      userId: user.id,
      webhook_secret: { data: encryptedData, iv, tag },
    });

    return secret;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
