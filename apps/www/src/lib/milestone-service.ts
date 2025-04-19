"use server";

import { db } from "@workspace/database/connection";
import {
  userMilestones,
  type MilestoneThresholds,
} from "@workspace/database/schema";

export async function processMilestones(
  userId: string,
  entityType: MilestoneThresholds["entityType"],
  milestoneType: MilestoneThresholds["milestoneType"],
  currentValue: number,
  entityId?: string,
) {
  const [thresholds, lastMilestone] = await db.batch([
    db.query.milestoneThresholds.findMany({
      where: (fields, { eq, and }) =>
        and(
          eq(fields.entityType, entityType),
          eq(fields.milestoneType, milestoneType),
          eq(fields.active, true),
        ),
    }),
    db.query.userMilestones.findFirst({
      where: (fields, { eq, and }) =>
        and(
          eq(fields.userId, userId),
          eq(fields.entityType, entityType),
          eq(fields.entityId, ""),
          eq(fields.milestoneType, milestoneType),
        ),
      orderBy: (fields, { desc }) => desc(fields.milestoneValue),
    }),
  ]);

  const lastMilestoneValue = lastMilestone?.milestoneValue || 0;
  const milestonesToCreate = [];

  for (const threshold of thresholds) {
    if (
      threshold.thresholdValue > lastMilestoneValue &&
      currentValue >= threshold.thresholdValue
    ) {
      milestonesToCreate.push({
        entityType,
        milestoneType,
        milestoneValue: threshold.thresholdValue,
        reachedAt: new Date(),
        userId,
        entityId: entityId ?? "",
        milestoneName: threshold.milestoneName,
      });
    }
  }

  const aggregatedMilestones = new Map<string, number>();

  if (milestonesToCreate.length > 0) {
    await db.insert(userMilestones).values(milestonesToCreate);

    for (const milestone of milestonesToCreate) {
      const currentCount =
        aggregatedMilestones.get(milestone.milestoneName) || 0;
      aggregatedMilestones.set(milestone.milestoneName, currentCount + 1);
    }

    return Array.from(aggregatedMilestones.entries()).map(([key, value]) => ({
      milestone: key,
      count: value,
    }));
  }

  return [];
}

export async function processMultipleMilestones(
  userId: string,
  configs: {
    entityType: MilestoneThresholds["entityType"];
    milestoneType: MilestoneThresholds["milestoneType"];
    entityId: string;
    currentValue: number;
  }[],
) {
  const requests = [];

  for (const config of configs) {
    requests.push(
      db.query.milestoneThresholds.findMany({
        where: (fields, { eq, and }) =>
          and(
            eq(fields.entityType, config.entityType),
            eq(fields.milestoneType, config.milestoneType),
            eq(fields.active, true),
          ),
      }),
    );

    requests.push(
      db.query.userMilestones.findFirst({
        where: (fields, { eq, and }) =>
          and(
            eq(fields.userId, userId),
            eq(fields.entityType, config.entityType),
            eq(fields.entityId, ""),
            eq(fields.milestoneType, config.milestoneType),
          ),
        orderBy: (fields, { desc }) => desc(fields.milestoneValue),
      }),
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny:
  const data = await db.batch(requests as [any, ...any[]]);

  const milestonesToCreate = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];

    if (!config) continue;

    const thresholds = data[i * 2] || []; // Even indices have threshold results, default to empty array
    const lastMilestone = data[i * 2 + 1]; // Odd indices have lastMilestone results

    const lastMilestoneValue = lastMilestone?.milestoneValue || 0;

    for (const threshold of thresholds) {
      if (
        threshold.thresholdValue > lastMilestoneValue &&
        config.currentValue >= threshold.thresholdValue
      ) {
        milestonesToCreate.push({
          entityType: config.entityType,
          milestoneType: config.milestoneType,
          milestoneValue: threshold.thresholdValue,
          reachedAt: new Date(),
          userId,
          entityId: "",
          milestoneName: threshold.milestoneName,
        });
      }
    }
  }

  const aggregatedMilestones = new Map<string, number>();

  if (milestonesToCreate.length > 0) {
    await db.insert(userMilestones).values(milestonesToCreate);

    for (const milestone of milestonesToCreate) {
      const currentCount =
        aggregatedMilestones.get(milestone.milestoneName) || 0;
      aggregatedMilestones.set(milestone.milestoneName, currentCount + 1);
    }

    return Array.from(aggregatedMilestones.entries()).map(([key, value]) => ({
      milestone: key,
      count: value,
    }));
  }

  return [];
}
