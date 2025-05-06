import { getCurrentSession } from "@/auth/session";
import { buttonVariants } from "@workspace/ui/components/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { FaSpotify } from "react-icons/fa6";

export default async function Page() {
  const { session, user } = await getCurrentSession();

  if (session || user) redirect(`/${user.slug}`);

  return (
    <div className="flex flex-col items-center">
      <Link
        href="/api/auth/spotify/login"
        className="inline-flex items-center justify-center gap-2 rounded-2xl text-base font-bold px-5 py-3 bg-[#1ED760] hover:bg-green-600 text-[#121212] transition-colors my-8"
      >
        <FaSpotify className="size-6" />
        Login with Spotify
      </Link>
      <p className="text-muted-foreground">
        By continuing you are agreeing to the{" "}
        <Link
          href="/privacy"
          className={buttonVariants({ variant: "link", className: "px-0" })}
        >
          Privacy Policy
        </Link>
        , and{" "}
        <Link
          href="/terms"
          className={buttonVariants({ variant: "link", className: "px-0" })}
        >
          Terms of Service
        </Link>
      </p>
    </div>
  );
}
