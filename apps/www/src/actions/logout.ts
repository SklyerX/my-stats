"use server";

import {
  deleteSessionTokenCookie,
  getCurrentSession,
  invalidateSession,
} from "@/auth/session";
import { redirect } from "next/navigation";

export async function logoutUserAction() {
  const { session } = await getCurrentSession();

  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await invalidateSession(session.id);
  await deleteSessionTokenCookie();

  return redirect("/login");
}
