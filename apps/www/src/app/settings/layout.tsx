import { getCurrentSession } from "@/auth/session";
import DashboardNav from "@/components/DashboardNav";
import { redirect } from "next/navigation";

import React, { type ReactNode } from "react";

export default async function SettingsLayout({
  children,
}: { children: ReactNode }) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) redirect("/login");

  return (
    <div className="flex w-full flex-col px-3 md:px-0">
      <div className="grid w-full items-start md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr] gap-4 md:gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-semibold">Settings</h1>
          <DashboardNav />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
