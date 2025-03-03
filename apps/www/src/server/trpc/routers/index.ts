import { router } from "../root";
import { artistsRouter } from "./artists/router";
import { tracksRouter } from "./tracks/router";
import { userRouter } from "./user/router";

export const appRouter = router({
  user: userRouter,
  artists: artistsRouter,
  tracks: tracksRouter,
});

export type AppRouter = typeof appRouter;
