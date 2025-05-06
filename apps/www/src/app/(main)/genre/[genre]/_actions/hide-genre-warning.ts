"use server";

import { COOKIE_VALUES } from "@/types";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function hideGenreWarning(genre: string) {
  (await cookies()).set(COOKIE_VALUES.SHOW_GENRE_WARNING, "true");

  revalidatePath(`/genre/${encodeURIComponent(genre)}`);
}
