import { router } from "../root";
import { albumsRouter } from "./albums/router";
import { artistsRouter } from "./artists/router";
import { tracksRouter } from "./tracks/router";
import { userRouter } from "./user/router";
import { internalRouter } from "./internal/router";

export const appRouter = router({
  user: userRouter,
  artists: artistsRouter,
  tracks: tracksRouter,
  albums: albumsRouter,
  internal: internalRouter,
});

export type AppRouter = typeof appRouter;
