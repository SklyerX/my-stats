import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/env";

const ENCRYPTION_KEY = env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits)
const ALGORITHM = "aes-256-gcm";

export function encrypt(text: string): {
  encryptedData: string;
  iv: string;
  tag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt(
  encryptedData: string,
  iv: string,
  tag: string,
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(iv, "hex"),
  );

  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
