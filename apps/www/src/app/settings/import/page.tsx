import Link from "next/link";
import React from "react";
import HistoryUploader from "../_components/import/HistoryUploader";
import { db } from "@workspace/database/connection";
import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const f = new Intl.DateTimeFormat();

export default async function Page() {
  const { session, user } = await getCurrentSession();

  if (!session || !user) redirect("/login");

  const exports = await db.query.userExports.findMany({
    where: (fields, { eq }) => eq(fields.userId, user.id),
    orderBy: (fields, { asc }) => asc(fields.userId),
  });

  return (
    <div>
      <div className="mb-5 space-y-2">
        <h3 className="text-3xl font-semibold">Import</h3>
        <p className="text-muted-foreground">
          Import your listening history from Spotify to get access to a whole
          new world of a statistics.
        </p>
        <p className="text-muted-foreground">
          Unsure where to start?{" "}
          <Link href="/docs/listening-history" className="text-primary">
            click here
          </Link>{" "}
          for a full guide and explanation
        </p>
      </div>
      <HistoryUploader />
      <div className="mt-5">
        {exports.map((userExport) => (
          <div key={userExport.exportId}>
            <div className="flex items-center gap-5">
              <h3 className="text-xl font-semibold">
                {userExport.fileName.split("/").reverse()[0]}
              </h3>
              <div
                className={cn("px-3 py-0.5 rounded-full", {
                  "bg-yellow-500/30 text-yellow-600":
                    userExport.status === "queued",
                  "bg-green-500/30 text-green-600":
                    userExport.status === "completed",
                })}
              >
                {userExport.status}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Uploaded on {f.format(userExport.uploadDate as Date)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
