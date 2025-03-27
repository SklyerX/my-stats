import { s3 } from "@/lib/s3-client";
import { convert } from "@sklyerx/size-convertor";
import {
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { env } from "@/env";
import { db } from "@workspace/database/connection";
import { userExports } from "@workspace/database/schema";
import { getCurrentSession } from "@/auth/session";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = convert("40mb", "b");

export async function POST(req: Request) {
  console.log("Entering uploading func");
  const { user, session } = await getCurrentSession();

  console.log("Session", session);

  if (!user || !session) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;

  console.log("is there a file", !!file);

  if (!file)
    return new Response("Please attach a file to upload", { status: 400 });

  console.log("Larger than limit?", file.size > MAX_FILE_SIZE);

  if (file.size > MAX_FILE_SIZE)
    return new Response("Please contact support, your file is over 40mb", {
      status: 400,
    });

  const isGzip =
    file.type === "application/gzip" ||
    file.type === "application/zip" ||
    file.name.endsWith(".gz") ||
    file.name.endsWith(".zip");

  console.log("Is zip", isGzip);

  if (!isGzip) return new Response("Please attach a gz file", { status: 400 });

  const id = randomBytes(16).toString("hex");

  console.log("GENERATED ID:", id);

  const jobId = `spotify-analysis-${id}`;

  console.log("Job ID", jobId);

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const s3Key = `uploads/${jobId}/${file.name}`;

  console.log("Key", s3Key);

  try {
    console.log("Creating params");
    const params: PutObjectCommandInput = {
      Bucket: env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
    };

    console.log("Creating command");

    const command = new PutObjectCommand(params);

    console.log("Sending command");

    await s3.send(command);

    console.log("Sent, inserting into queued exports");

    await db.insert(userExports).values({
      fileName: s3Key,
      userId: user.id,
      exportId: id,
    });

    console.log("Sending back");

    const url =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8080"
        : env.WORKER_URL;

    const request = new Request(`${url}/process`, {
      method: "POST",
      body: JSON.stringify({
        s3_key: s3Key,
        process_id: id,
        user_id: user.id,
      }),
    });

    request.headers.set("Content-Type", "application/json");
    request.headers.set("x-api-key", env.APP_AUTH_KEY);

    await fetch(request);

    return new Response(
      JSON.stringify({
        message: "Upload successful awaiting processing",
        jobId: id,
        status: "queued",
      }),
    );
  } catch (err) {
    logger.error("Error while uploading file", err);
    return new Response("Upload failed", { status: 500 });
  }
}
