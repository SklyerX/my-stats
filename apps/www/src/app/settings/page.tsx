import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";
import ProfileSettings from "./_components/profile/ProfileSettings";

export default async function Page() {
  const { user } = await getCurrentSession();

  if (!user) redirect("/login");

  return <ProfileSettings user={user} />;
}
