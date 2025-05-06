import { tracks } from "@workspace/database/schema";
import { createSelectSchema } from "drizzle-zod";

export const trackSchema = createSelectSchema(tracks);
