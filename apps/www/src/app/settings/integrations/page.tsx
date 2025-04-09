import { getCurrentSession } from "@/auth/session";
import { db } from "@workspace/database/connection";
import { redirect } from "next/navigation";

import PlatformConnector from "../_components/integrations/PlatformConnector";

export default async function Page() {
  const { user } = await getCurrentSession();

  if (!user) redirect("/login");

  const integrations = await db.query.integrations.findMany({
    where: (fields, { eq }) => eq(fields.userId, user.id),
  });

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-3xl font-semibold mb-2">Integrations</h3>
        <p className="text-muted-foreground">
          Connect other social platforms and for a touch of personalization ro
          to flex them on your profile!
        </p>
      </div>
      <PlatformConnector integrations={integrations} />
    </div>
  );
}
