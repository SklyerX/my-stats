"use server";

import { db } from "@workspace/database/connection";
import { cache } from "react";

async function checkAPIKeyValidity(apiKey: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const existingAPIKey = await db.query.apiKeys.findFirst({
    where: (fields, { eq }) => eq(fields.secretHash, hashHex),
  });

  return !!existingAPIKey;
}

export const isValidAPIKey = cache(checkAPIKeyValidity);
