import { NextResponse } from "next/server";

import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { env } from "@/env";
import { db } from "@workspace/database/connection";
import { s3 } from "@/lib/s3-client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (token !== env.CRON_SECRET)
    return new NextResponse("Unauthorized", { status: 401 });

  const fiveMinutesAgo = new Date(Date.now() - 1000 * 60 * 5);

  const exports = await db.query.downloadExports.findMany({
    where: (fields, { lt }) => lt(fields.createdAt, fiveMinutesAgo),
  });

  const keys = exports.map((e) => ({ Key: e.s3Key }));

  const command = new DeleteObjectsCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Delete: {
      Objects: keys,
    },
  });

  await s3.send(command);

  return new Response(`Successfully cleaned up ${keys.length} object(s)`);
}
