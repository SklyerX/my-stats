import { publicProcedure, router } from "../../root";
import { topStatsSchema } from "./types";

export const userRouter = router({
  top: publicProcedure
    .input(topStatsSchema)
    .query(async ({ ctx, input }) => {}),
});
