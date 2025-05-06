import { hasPrivacyFlag, PRIVACY_FLAGS } from "@/lib/flags";
import { db } from "@workspace/database/connection";
import {
  entityTypeEnum,
  milestoneTypeEnum,
  userMilestones,
  users,
  type UserMilestones,
} from "@workspace/database/schema";
import { and, eq, or, sql } from "@workspace/database/drizzle";
import { EnumValues, z } from "zod";

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
  const entityType = url.searchParams.get("entity_type");

  const result = validateRequest(
    milestoneType,
    entityType,
    offset,
    limit,
    milestoneTypeEnum,
    entityTypeEnum,
  );

  if (!result.valid) {
    return new Response(result.message, { status: 400 });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.id, identifier), eq(users.slug, identifier)))
      .limit(1);

    if (!user) return new Response("User not found", { status: 404 });

    const isPrivacyEnabled = hasPrivacyFlag(
      user.flags,
      PRIVACY_FLAGS.MILESTONES,
    );

    if (isPrivacyEnabled)
      return new Response(
        JSON.stringify(
          "The requested user has disabled sharing of their milestones",
        ),
        { status: 403 },
      );

    const conditions = [eq(userMilestones.userId, user.id)];

    if (milestoneType) {
      conditions.push(
        eq(
          userMilestones.milestoneType,
          milestoneType as (typeof milestoneTypeEnum.enumValues)[number],
        ),
      );
    }

    if (entityType) {
      conditions.push(
        eq(
          userMilestones.entityType,
          entityType as (typeof entityTypeEnum.enumValues)[number],
        ),
      );
    }

    const milestones = await db
      .select()
      .from(userMilestones)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    if (!milestones || milestones.length === 0)
      return new Response(
        "This user has not reached any noticeable milestones yet.",
        { status: 409 },
      );

    const totalCount = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(userMilestones)
      .where(and(...conditions))
      .then((rows) => rows[0]?.count || 0);

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    const response = {
      data: buildResponse(
        Array.isArray(milestones) ? milestones : [milestones],
      ),
      pagination: {
        total_items: totalCount,
        total_pages: totalPages,
        current_page: currentPage,
        items_per_page: limit,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: {
        "Cache-Control":
          "private, max-age=3600, vary=limit,offset,milestone_type,entity_type",
        ETag: `"${user.id}-${limit}-${offset}-${milestoneType || "all"}-${entityType || "all"}"`,
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
    entity_type: milestone.entityType,
    value: milestone.milestoneValue,
    reached_at: milestone.reachedAt,
    for: milestone.entityId || "unknown source",
  }));
}

const validateEnum = <T>(value: string, enumValues: T[]) => {
  if (!value) return true;

  const enumObj = Object.fromEntries(enumValues.map((value) => [value, value]));

  return z.nativeEnum(enumObj).safeParse(value).success;
};

const validateRequest = (
  milestoneType: string | null,
  entityType: string | null,
  offset: number,
  limit: number,
  milestoneTypeEnum: { enumValues: string[] },
  entityTypeEnum: { enumValues: string[] },
) => {
  if (offset > 50 || limit > 50) {
    return {
      valid: false,
      message: "Pagination values exceed maximum limit of 50",
    };
  }

  if (
    milestoneType &&
    !validateEnum(milestoneType, milestoneTypeEnum.enumValues)
  ) {
    return {
      valid: false,
      message: `Invalid milestone type: ${milestoneType}`,
    };
  }

  if (entityType && !validateEnum(entityType, entityTypeEnum.enumValues)) {
    return {
      valid: false,
      message: `Invalid entity type: ${entityType}`,
    };
  }

  return { valid: true };
};
