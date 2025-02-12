import { getCurrentSession } from "@/auth/session";
import { middleware, publicProcedure } from "@/server/trpc/root";
import { TRPCError } from "@trpc/server";

export const isAuthenticated = middleware(async ({ next }) => {
  const { session, user } = await getCurrentSession();

  if (!session || !user)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });

  return next({
    ctx: {
      session,
      user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthenticated);
