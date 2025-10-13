import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import type { User as UserType } from "@workspace/database/schema";

export interface UserProps {
  user: UserType;
}

export function User({ user }: UserProps) {
  return (
    <Link href={`/${user.slug}`}>
      <div className="aspect-square">
        <img
          src={user.image || "https://via.placeholder.com/1000"}
          alt={user.username}
          className="rounded-full w-full h-full object-cover"
        />
        <div className="mt-2 font-semibold text-lg text-center flex flex-col items-center">
          <span className="text-muted-foreground">@{user.slug}</span>
          {user.username}
        </div>
      </div>
    </Link>
  );
}
