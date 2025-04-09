"use server";

import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { eq } from "@workspace/database/drizzle";
import { users } from "@workspace/database/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  bio: z.string().max(150).optional(),
  slug: z
    .string()
    .min(2)
    .max(30)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
  username: z.string().min(2).max(30).optional(),
});

export async function updateProfile(input: z.infer<typeof schema>) {
  const { user } = await getCurrentSession();

  if (!user) throw new Error("Unauthorized");

  const { data, success } = schema.passthrough().safeParse(input);

  if (!success) throw new Error("Invalid data - Bad Request");

  if (Object.keys(data).length > 0) {
    if (data.slug) {
      const existingSlugUser = await db.query.users.findFirst({
        where: (fields, { eq, and, ne }) =>
          and(eq(fields.slug, data.slug as string), ne(users.id, user.id)),
      });

      if (existingSlugUser)
        throw new Error("A user with this slug already exists!");
    }

    await db.update(users).set(data).where(eq(users.id, user.id));
  }

  revalidatePath("/settings");
}
