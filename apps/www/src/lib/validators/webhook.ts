import { z } from "zod";

export const webhookNameSchema = z.string().min(1).max(50);

export const webhookFormSchema = z.object({
  name: webhookNameSchema,
  url: z.string().url(),
});

export type WebhookFormSchema = z.infer<typeof webhookFormSchema>;
