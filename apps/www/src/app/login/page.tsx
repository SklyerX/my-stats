import Link from "next/link";
import React from "react";

export default function Page() {
  return (
    <div>
      <Link href="/api/auth/spotify/login">Login</Link>
    </div>
  );
}
