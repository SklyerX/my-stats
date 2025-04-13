import { getUrl } from "@/lib/utils";
import { db } from "@workspace/database/connection";

interface Props {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { identifier } = await params;

  const existingUser = await db.query.users.findFirst({
    where: (fields, { eq, or }) =>
      or(eq(fields.id, identifier), eq(fields.slug, identifier)),
    columns: {
      bio: true,
      username: true,
      spotifyId: true,
      slug: true,
      image: true,
    },
    with: {
      history: true,
    },
  });

  if (!existingUser) return new Response("User not found", { status: 404 });

  const { history, ...rest } = existingUser;

  const responseObject = {
    history: {
      hasImported: !!history,
      href: `${getUrl("api")}/v1/stats/users/${identifier}/history`,
    },
    ...rest,
  };

  return new Response(JSON.stringify(responseObject), {
    headers: {
      "Cache-Control": "private, max-age=3600",
    },
  });
}
