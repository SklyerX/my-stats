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

  return <PlatformConnector integrations={integrations} />;
}
