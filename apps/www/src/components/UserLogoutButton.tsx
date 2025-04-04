"use client";

import { logoutUserAction } from "@/actions/logout";
import { useRouter } from "next/navigation";
import { CiLogout } from "react-icons/ci";
import { toast } from "@workspace/ui/components/sonner";

export default function UserLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await logoutUserAction();
    if (error) {
      toast.error("You are not authenticated");
      router.refresh();
      return;
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 w-full cursor-pointer"
    >
      <CiLogout className="size-4" />
      Logout
    </button>
  );
}
