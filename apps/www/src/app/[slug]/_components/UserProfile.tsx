import React from "react";
import Image from "next/image";
import type { InternalTopUserStats } from "@/types/response";

interface Props {
  user: InternalTopUserStats["user"];
}

export default function UserProfile({ user }: Props) {
  return (
    <div className="flex gap-8">
      {/* <div className="w-40 h-40 relative"> */}
      <Image
        src={user.image}
        alt={`${user.name}`}
        width={120}
        height={120}
        className="rounded-full"
      />
      {/* </div> */}
      <div className="mt-4">
        <h2 className="text-3xl font-extrabold">{user.name}</h2>
        <p className="text-muted-foreground mt-1">
          {user.bio ?? "is you like that"}
        </p>
      </div>
    </div>
  );
}
