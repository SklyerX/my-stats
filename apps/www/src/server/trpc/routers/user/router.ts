import { z } from "zod";
import { publicProcedure, router } from "../../root";

export const userRouter = router({
  top: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {}),
});
