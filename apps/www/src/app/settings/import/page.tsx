import Link from "next/link";
import React from "react";
import HistoryUploader from "../_components/import/HistoryUploader";

export default function Page() {
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
    </div>
  );
}
