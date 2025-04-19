"use server";

import pRetry, { AbortError } from "p-retry";

// biome-ignore lint/style/useNodejsImportProtocol:
import crypto from "crypto";

interface SendWebhookParams {
  url: string;
  secret: string;
  payload: Record<string, unknown>;
}

function signWebhookPayload({
  payload,
  secret,
}: Pick<SendWebhookParams, "secret" | "payload">) {
  const stringPayload =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(stringPayload);

  return hmac.digest("hex");
}

async function run({ url, secret, payload }: SendWebhookParams) {
  const signature = signWebhookPayload({
    payload,
    secret,
  });

  const request = new Request(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  request.headers.set("Content-Type", "application/json");
  request.headers.set("X-Webhook-Signature", signature);
  request.headers.set("X-Webhook-Timestamp", new Date().toString());

  const res = await fetch(request);

  return {
    isError: !res.ok,
    request: {
      body: request.body,
      method: request.method,
      headers: Array.from(request.headers.entries()).map(([key, value]) => ({
        header: key,
        value,
      })),
    },
    response: {
      headers: Array.from(
        Array.from(res.headers.entries()).map(([key, value]) => ({
          key,
          value,
        })),
      ),
      status: res.status,
    },
  };
}

export async function sendWebhook(data: SendWebhookParams) {
  const result = await pRetry(() => run(data), { retries: 3 });
  return result;
}
