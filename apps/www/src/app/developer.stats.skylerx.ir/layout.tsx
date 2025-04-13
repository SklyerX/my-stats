import { getCurrentSession } from "@/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { redirect } from "next/navigation";
import React, { type ReactNode } from "react";

export default async function DeveloperLayout({
  children,
}: { children: ReactNode }) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) redirect("http://stats.skylerx.ir:3000/login");

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
