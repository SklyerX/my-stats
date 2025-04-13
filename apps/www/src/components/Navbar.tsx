import type { User } from "@workspace/database/schema";
import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import UserDropdown from "./UserDropdown";

interface Props {
  user?: User | null;
}

export default function Navbar({ user }: Props) {
  return (
    <nav className="w-full px-4">
      <div className="container mx-auto max-w-5xl flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-3xl font-semibold mr-4">
            MyStats
          </Link>
          <Link href="/blog" className="text-muted-foreground font-medium">
            Blog
          </Link>
        </div>
        <div>
          {user ? (
            <UserDropdown user={user} />
          ) : (
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline" })}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
