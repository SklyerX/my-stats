import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";
import PrivacySettings from "../_components/privacy/PrivacySettings";

export default async function Privacy() {
  const { user } = await getCurrentSession();

  if (!user) redirect("/login");

  return <PrivacySettings initialFlags={user.flags} />;
}
