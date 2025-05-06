"use client";

import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const paths = [
  {
    href: "/settings",
    name: "Profile",
  },
  {
    href: "/settings/privacy",
    name: "Privacy",
  },
  {
    href: "/settings/integrations",
    name: "Integrations",
  },
  {
    href: "/settings/import",
    name: "Import & Syncing",
  },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-4 text-muted-foreground">
      {paths.map((path) => (
        <Link
          href={path.href}
          className={cn({
            "font-semibold text-primary": pathname === path.href,
          })}
          key={path.name}
        >
          {path.name}
        </Link>
      ))}
    </nav>
  );
}
