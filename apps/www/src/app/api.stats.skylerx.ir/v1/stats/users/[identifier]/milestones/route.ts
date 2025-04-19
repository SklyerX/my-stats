import { hasPrivacyFlag, PRIVACY_FLAGS } from "@/lib/flags";
import { db } from "@workspace/database/connection";
import {
  milestoneTypeEnum,
  userMilestones,
  users,
  type UserMilestones,
} from "@workspace/database/schema";
import { eq, or } from "@workspace/database/drizzle";
import { z } from "zod";

interface Props {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(req: Request, { params }: Props) {
  const { identifier } = await params;

  const url = new URL(req.url);

  const offset = Number.parseInt(url.searchParams.get("offset") || "0");
  const limit = Number.parseInt(url.searchParams.get("limit") || "50");
  const milestoneType = url.searchParams.get("milestone_type");

  if (
    milestoneType &&
    !z
      .nativeEnum(
        Object.fromEntries(
          milestoneTypeEnum.enumValues.map((value) => [value, value]),
        ),
      )
      .safeParse(milestoneType).success
  )
    return new Response("Invalid milestone type", { status: 400 });

  try {
    const [existingUser] = await db
      .select({
        user: users,
        milestones: userMilestones,
      })
      .from(users)
      .leftJoin(userMilestones, eq(userMilestones.userId, users.id))
      .where(or(eq(users.id, identifier), eq(users.slug, identifier)))
      .limit(limit)
      .offset(offset);

    if (!existingUser?.user)
      return new Response("User not found", { status: 404 });

    const isPrivacyEnabled = hasPrivacyFlag(
      existingUser.user.flags,
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

    const responseData = buildResponse(
      Array.isArray(existingUser.milestones)
        ? existingUser.milestones
        : [existingUser.milestones],
    );

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
