import type { User } from "@workspace/database/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import Link from "next/link";

import { SettingsIcon, UserIcon } from "lucide-react";
import { FiTerminal } from "react-icons/fi";
import UserLogoutButton from "./UserLogoutButton";
import { getUrl } from "@/lib/utils";

interface Props {
  user: Pick<User, "email" | "slug" | "image" | "username">;
}

export default function UserDropdown({ user }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <img
          src={user.image || "https://via.placeholder.com/1000"}
          alt={`${user.username || "User"}'s profile picture`}
          className="rounded-full w-14 h-14"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-semibold">{user.username}</p>
            <p className="w-[200px] text-muted-foreground truncate text-sm">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link
            href={`/${user.slug}`}
            className="flex items-center gap-2 w-full"
          >
            <UserIcon className="size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link
            href={getUrl("developer")}
            className="flex items-center gap-2 w-full"
          >
            <FiTerminal className="size-4" />
            Developer Portal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/settings" className="flex items-center gap-2 w-full">
            <SettingsIcon className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <UserLogoutButton />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
