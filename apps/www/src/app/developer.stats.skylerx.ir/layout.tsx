import { getCurrentSession } from "@/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { getUrl } from "@/lib/utils";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import React, { type ReactNode } from "react";

export default async function DeveloperLayout({
  children,
}: { children: ReactNode }) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) redirect(`${getUrl()}/login`);

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <main className="p-4 pt-0">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
