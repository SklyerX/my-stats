import { buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-3xl font-semibold mb-2">Yikes!</h2>
      <p className="text-muted-foreground font-medium mb-10">
        Hate to be the bearer of bad news but...This user doesn't exist
      </p>
      <div className="flex items-center gap-2">
        <Link href="/" className={buttonVariants()}>
          Go Home
        </Link>
      </div>
    </div>
  );
}
