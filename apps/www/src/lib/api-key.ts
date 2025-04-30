"use server";

import { db } from "@workspace/database/connection";
import type { NextRequest } from "next/server";
import { cache } from "react";
import { redis } from "./redis";
import type { UserUsage } from "@/types";

const RATE_LIMIT_WINDOW = 60;
const MAX_REQUESTS = 10;
const MONTHLY_LIMIT = 700;

async function hashApiKey(apiKey: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

async function checkAPIKeyValidity(apiKey: string) {
  const hashHex = await hashApiKey(apiKey);

  const existingAPIKey = await db.query.apiKeys.findFirst({
    where: (fields, { eq }) => eq(fields.secretHash, hashHex),
    with: {
      user: true,
    },
  });

  return !!existingAPIKey;
}

export const isValidAPIKey = cache(checkAPIKeyValidity);

export async function checkRateLimit(req: NextRequest, apiKey: string) {
  const hashedKey = await hashApiKey(apiKey);

  const endpoint = req.nextUrl.pathname || "unknown";
  const key = `ratelimit:${hashedKey}:${endpoint}`;
  const now = Math.floor(Date.now() / 1000);

  const requestId = `${now}:${Math.random().toString(36).substring(2, 15)}`;

  await redis.zadd(key, { score: now, member: requestId });

  await redis.zremrangebyscore(key, 0, now - RATE_LIMIT_WINDOW);

  const requestCount = await redis.zcard(key);

  await redis.expire(key, RATE_LIMIT_WINDOW * 2);

  await redis.hincrby(`ratelimit:metrics:${hashedKey}`, "total_requests", 1);

  if (requestCount > MAX_REQUESTS) {
    await redis.hincrby(`ratelimit:metrics:${hashedKey}`, "rate_limited", 1);
    return true;
  }

  return false;
}

export async function trackUsage(req: NextRequest, apiKey: string) {
  const hashedApiKey = await hashApiKey(apiKey);
  const monthYear = new Date().toISOString().substring(0, 7);

  const date = new Date().toISOString().split("T")[0];
  const endpoint = req.nextUrl.pathname || "unknown";
  const method = req.method || "unknown";

  await redis.hincrby(`usage:${hashedApiKey}:${date}`, endpoint, 1);

  await redis.hincrby(`usage:${hashedApiKey}:total`, endpoint, 1);
  await redis.hincrby(`usage:${hashedApiKey}:${monthYear}`, "total", 1);

  await redis.hset(`usage:${hashedApiKey}:metadata`, {
    lastAccess: Date.now(),
    lastEndpoint: endpoint,
    lastMethod: method,
  });
}

export async function getRemainingMonthlyRequests(keyHash: string) {
  const monthYear = new Date().toISOString().substring(0, 7);

  const monthlyUsage = (await redis.hget(
    `usage:${keyHash}:${monthYear}`,
    "total",
  )) as number | null;

  const remaining = Math.max(0, MONTHLY_LIMIT - (monthlyUsage || 0));
  return remaining;
}

export async function getApiKeyUsage(keyHash: string) {
  if (!keyHash) return null;

  const date = new Date().toISOString().split("T")[0];
  const monthYear = new Date().toISOString().substring(0, 7);

  const [dailyUsage, totalUsage, monthlyUsage, metadata, rateLimitMetrics] =
    await Promise.all([
      redis.hgetall(`usage:${keyHash}:${date}`) || {},
      redis.hgetall(`usage:${keyHash}:total`) || {},
      redis.hgetall(`usage:${keyHash}:${monthYear}`) || {},
      redis.hgetall(`usage:${keyHash}:metadata`) || {},
      redis.hgetall(`ratelimit:metrics:${keyHash}`) || {},
    ]);

  const remaining = await getRemainingMonthlyRequests(keyHash);

  if (metadata?.lastAccess) {
    metadata.lastAccess = Number(metadata?.lastAccess);
  }

  const metrics = {
    total_requests: Number(rateLimitMetrics?.total_requests || 0),
    ...rateLimitMetrics,
  };

  return {
    daily: dailyUsage,
    total: totalUsage,
    monthly: {
      total: Number(monthlyUsage?.total || 0),
      ...monthlyUsage,
    },
    metadata,
    limits: {
      monthly: MONTHLY_LIMIT,
      remaining,
    },
    metrics,
  };
}

export async function getRateLimitMetrics(keyHash: string) {
  const metrics = (await redis.hgetall(`ratelimit:metrics:${keyHash}`)) || {};

  return Object.entries(metrics).reduce(
    (acc, [key, value]) => {
      acc[key] = Number(value);
      return acc;
    },
    {} as Record<string, number>,
  );
}

export async function getUserUsage(keyHashes: string[]) {
  if (!keyHashes.length) return { apiKeys: [] };

  const date = new Date().toISOString().split("T")[0];
  const monthYear = new Date().toISOString().substring(0, 7);

  const infoKeys = keyHashes.map((hash) => `apikey:${hash}:info`);
  const dailyUsageKeys = keyHashes.map((hash) => `usage:${hash}:${date}`);
  const totalUsageKeys = keyHashes.map((hash) => `usage:${hash}:total`);
  const metadataKeys = keyHashes.map((hash) => `usage:${hash}:metadata`);
  const metricsKeys = keyHashes.map((hash) => `ratelimit:metrics:${hash}`);
  const monthlyUsageKeys = keyHashes.map(
    (hash) => `usage:${hash}:${monthYear}`,
  );

  const [
    infoResults,
    dailyUsageResults,
    totalUsageResults,
    metadataResults,
    metricsResults,
    monthlyUsageResults,
  ] = await Promise.all([
    Promise.all(infoKeys.map((key) => redis.hgetall(key))),
    Promise.all(dailyUsageKeys.map((key) => redis.hgetall(key))),
    Promise.all(totalUsageKeys.map((key) => redis.hgetall(key))),
    Promise.all(metadataKeys.map((key) => redis.hgetall(key))),
    Promise.all(metricsKeys.map((key) => redis.hgetall(key))),
    Promise.all(monthlyUsageKeys.map((key) => redis.hgetall(key))),
  ]);

  const aggregatedTotal: Record<string, number> = {};
  for (const total of totalUsageResults) {
    if (total) {
      for (const [endpoint, count] of Object.entries(total)) {
        aggregatedTotal[endpoint] =
          (aggregatedTotal[endpoint] || 0) + Number(count);
      }
    }
  }

  const totalMonthlyUsage = monthlyUsageResults.reduce((sum, monthly) => {
    return sum + Number(monthly?.total || 0);
  }, 0);

  let latestMetadata = { lastAccess: 0 };

  for (const metadata of metadataResults) {
    if (metadata) {
      const lastAccess = Number(metadata.lastAccess || 0);
      if (lastAccess > Number(latestMetadata.lastAccess)) {
        latestMetadata = {
          ...metadata,
          lastAccess: Number(metadata.lastAccess),
        };
      }
    }
  }

  const apiKeyData = keyHashes.map((keyHash, index) => {
    // Format metadata
    const metadata = metadataResults[index] || {};
    if (metadata.lastAccess) {
      metadata.lastAccess = Number(metadata.lastAccess);
    }

    // Format metrics
    const metrics = Object.entries(metricsResults[index] || {}).reduce(
      (acc, [key, value]) => {
        acc[key] = Number(value);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      keyHash,
      info: infoResults[index] || {},
      usage: {
        daily: dailyUsageResults[index] || {},
        total: totalUsageResults[index] || {},
        metadata: {
          ...metadata,
          lastAccess: metadata.lastAccess
            ? Number(metadata.lastAccess)
            : undefined,
        },
      },
      metrics,
    };
  });

  const remaining = Math.max(0, MONTHLY_LIMIT - totalMonthlyUsage);

  return {
    apiKeys: apiKeyData,
    daily: {},
    total: aggregatedTotal,
    monthly: {
      total: totalMonthlyUsage,
    },
    metadata: latestMetadata,
    limits: {
      monthly: MONTHLY_LIMIT,
      remaining,
    },
  };
}

export async function getDashboardData(userId: string) {
  const apiKeys = await db.query.apiKeys.findMany({
    where: (fields, { eq }) => eq(fields.userId, userId),
  });

  const keyHashes = apiKeys.map((key) => key.secretHash);

  const [userUsage, firstKeyUsage] = await Promise.all([
    getUserUsage(keyHashes),
    getApiKeyUsage(keyHashes[0] || ""),
  ]);

  return {
    userUsage: userUsage ? (userUsage as unknown as UserUsage) : null,
    firstKeyUsage,
  };
}
