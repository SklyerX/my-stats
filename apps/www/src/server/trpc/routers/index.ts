import { router } from "../root";
import { artistsRouter } from "./artists/router";
import { userRouter } from "./user/router";

export const appRouter = router({
  user: userRouter,
  artists: artistsRouter,
});

export type AppRouter = typeof appRouter;
