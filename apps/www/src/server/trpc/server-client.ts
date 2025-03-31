import { httpBatchLink } from "@trpc/client";
import { appRouter } from "@/server/trpc/routers";

export const serverClient = appRouter.createCaller({
  // @ts-ignore
  links: [
    httpBatchLink({
      url:
        process.env.NODE_ENV === "development"
          ? "http://localhost:3000/api/trpc"
          : `https://${process.env.VERCEL_URL}/api/trpc`,
    }),
  ],
});
