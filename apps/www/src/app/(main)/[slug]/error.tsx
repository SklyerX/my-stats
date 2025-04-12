"use client";

import { buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";
import React from "react";

export default function ErrorPage() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-3xl font-semibold mb-2">
        Damn something went wrong!
      </h2>
      <p className="text-muted-foreground font-medium mb-10">
        Looks like something didn't go as planned...
      </p>
      <div className="flex items-center gap-2">
        <Link href="/" className={buttonVariants()}>
          Go Home
        </Link>
      </div>
    </div>
  );
}
