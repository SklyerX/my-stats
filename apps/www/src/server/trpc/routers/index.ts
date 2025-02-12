import { publicProcedure, router } from "../root";

export const appRouter = router({
  getTodos: publicProcedure.query(async () => {
    return [1, 2, 3, 4];
  }),
});

export type AppRouter = typeof appRouter;
