import { getCurrentSession } from "@/auth/session";
import { redirect } from "next/navigation";

export default async function MyStuffLayout({
  children,
}: { children: React.ReactNode }) {
  const { session, user } = await getCurrentSession();

  if (!session || !user) redirect("/login");

  return <>{children}</>;
}
