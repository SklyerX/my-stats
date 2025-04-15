import { hasPrivacyFlag, PRIVACY_FLAGS } from "@/lib/flags";
import { db } from "@workspace/database/connection";
import type { UserMilestones } from "@workspace/database/schema";

interface Props {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { identifier } = await params;

  try {
    const existingUser = await db.query.users.findFirst({
      where: (fields, { eq, or }) =>
        or(eq(fields.id, identifier), eq(fields.slug, identifier)),
      with: {
        milestones: true,
      },
    });

    if (!existingUser) return new Response("User not found", { status: 404 });

    const isPrivacyEnabled = hasPrivacyFlag(
      existingUser.flags,
      PRIVACY_FLAGS.MILESTONES,
    );

    if (isPrivacyEnabled)
      return new Response(
        JSON.stringify(
          "The requested user has disabled sharing of their milestones",
        ),
        { status: 403 },
      );

    if (!existingUser.milestones)
      return new Response(
        "This user has not reached any noticeable milestones yet.",
        { status: 409 },
      );

    const responseData = buildResponse(existingUser.milestones);

    return new Response(JSON.stringify(responseData), {
      headers: {
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Something went wrong", { status: 500 });
  }
}

function buildResponse(milestones: UserMilestones[]) {
  return milestones.map((milestone) => ({
    based_on: milestone.entityType,
    name: milestone.milestoneName,
    milestone_type: milestone.milestoneType,
    value: milestone.milestoneValue,
    reached_at: milestone.reachedAt,
  }));
}
