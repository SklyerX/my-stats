import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";
import ProfileSettings from "./_components/ProfileSettings";

export default async function Page() {
  const { user } = await getCurrentSession();

  if (!user) redirect("/login");

  return <ProfileSettings user={user} />;
}
