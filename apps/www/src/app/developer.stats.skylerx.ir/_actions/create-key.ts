"use server";

import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { apiKeys } from "@workspace/database/schema";
import { z } from "zod";

// biome-ignore lint/style/useNodejsImportProtocol: node prefix doesn't work in edge runtime
import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

export async function createKeyAction(name: string) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) throw new Error("Unauthorized");

  const { data, success, error } = z.string().max(50).min(1).safeParse(name);

  if (!success) throw new Error(error.message);

  const apiKey = randomBytes(32).toString("hex");
  const secretHash = createHash("sha256").update(apiKey).digest("hex");

  await db.insert(apiKeys).values({
    name: data,
    secretHash,
    userId: user.id,
  });

  revalidatePath("/keys");

  return apiKey;
}
