import { getCurrentSession } from "@/auth/session";
import { getDashboardData } from "@/lib/api-key";
import { getUrl } from "@/lib/utils";
import { db } from "@workspace/database/connection";
import { redirect } from "next/navigation";
import UsageDashboard from "../_components/usage/page";
import { Ghost } from "lucide-react";

export default async function Page() {
  const { session, user } = await getCurrentSession();

  if (!session || !user) redirect(`${getUrl()}/login`);

  const dashboardData = await getDashboardData(user.id);

  return dashboardData.userUsage ? (
    <UsageDashboard data={dashboardData.userUsage} />
  ) : (
    <div>
      <div className="w-full h-96 border border-dashed border-muted-foreground rounded-md py-5 flex flex-col items-center justify-between">
        <Ghost className="size-6" />
        <h3 className="text-2xl font-semibold">No logs</h3>
        <p className="border-muted-foreground">
          No longs found yet! Send an API request using your API key(s) and come
          back later!
        </p>
      </div>
    </div>
  );
}
