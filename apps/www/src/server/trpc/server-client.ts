import { httpBatchLink } from "@trpc/client";
import { appRouter } from "@/server/trpc/routers";
import { getUrl } from "@/lib/utils";

export const serverClient = appRouter.createCaller({
  // @ts-ignore
  links: [
    httpBatchLink({
      url: `${getUrl()}/api/trpc`,
    }),
  ],
});
