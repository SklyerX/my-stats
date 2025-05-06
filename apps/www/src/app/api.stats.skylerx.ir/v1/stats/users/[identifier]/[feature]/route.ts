import { CACHE_TIMES } from "@/lib/constants";
import { getUserTopStatsWithFieldsAndPrivacy } from "@/lib/spotify/user-stats-service";
import { TIME_RANGES } from "@/types/spotify";
import { db } from "@workspace/database/connection";
import { z, ZodError } from "zod";

interface Props {
  params: Promise<{
    identifier: string;
    feature: string;
  }>;
}

const statsFieldEnum = z.enum(["tracks", "albums", "artists", "genres"]);

const schema = z.object({
  time_range: z.enum(TIME_RANGES).optional().default("short_term"),
  include: z.array(statsFieldEnum).max(4).optional(),
  limit: z.number().min(1).max(50).optional().default(25),
  offset: z.number().min(0).max(50).optional().default(0),
});

export async function GET(req: Request, { params }: Props) {
  const { identifier, feature } = await params;

  if (!statsFieldEnum.safeParse(feature).success)
    return new Response("Unsupported feature", { status: 404 });

  const existingUser = await db.query.users.findFirst({
    where: (fields, { or, eq }) =>
      or(eq(fields.slug, identifier), eq(fields.id, identifier)),
  });

  if (!existingUser) return new Response("User not found", { status: 404 });

  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const includeSearchParam = searchParams.get("include");

  const $limit = Number.parseInt(searchParams.get("limit") || "50");
  const $offset = Number.parseInt(searchParams.get("offset") || "0");
  const $timeRange = searchParams.get("time_range") ?? "short_term";

  const $include = includeSearchParam?.split(",") || [];

  if (!$include.includes(feature)) {
    $include.push(feature);
  }

  const dataToParse = {
    limit: $limit,
    offset: $offset,
    timeRange: $timeRange,
    include: $include,
  };

  try {
    const { include, limit, offset, time_range } = schema.parse(dataToParse);

    const result = await getUserTopStatsWithFieldsAndPrivacy(
      existingUser,
      existingUser.flags,
      include,
      time_range,
      limit,
      offset,
    );

    return new Response(JSON.stringify(result), {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_TIMES[time_range]}`,
      },
    });
  } catch (err) {
    if (err instanceof ZodError)
      return new Response(JSON.stringify(err.errors), { status: 400 });
    return new Response(
      "Something went wrong while fetching data for this user",
      { status: 500 },
    );
  }
}
