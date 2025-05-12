"use client";

import type { User } from "@workspace/database/schema";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import ProfileForm from "./forms/ProfileForm";
import BioForm from "./forms/BioForm";
import { Button } from "@workspace/ui/components/button";

import { useProfileFormStore } from "@/stores/profile-form";
import { toast } from "@workspace/ui/components/sonner";
import { updateProfile } from "../../_actions/update-profile";
import DeleteAccount from "./DeleteAccount";

interface Props {
  user: User;
}

export default function ProfileSettings({ user }: Props) {
  const { data } = useProfileFormStore();
  const [saveable, setSaveable] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (Object.keys(data).length !== 0) setSaveable(true);
  }, [data]);

  const handleSave = () => {
    setLoading(true);

    toast.promise(updateProfile(data), {
      loading: "Saving data...",
      success: () => {
        setLoading(false);

        return "Successfully saved data";
      },
      error: (err) => {
        if (err instanceof Error) {
          return err.message;
        }

        return "Something went wrong while saving data";
      },
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-semibold">Profile</h3>
        <Button
          disabled={!saveable || loading}
          onClick={handleSave}
          className="mb-4"
        >
          Save
        </Button>
      </div>
      <div className="flex gap-6 items-center mt-10">
        <img
          src={user.image || "https://via.placeholder.com/1000"}
          alt={`${user.username}'s profile cover`}
          className="rounded-full w-36 h-36"
        />
        <ProfileForm user={user} />
      </div>
      <BioForm user={user} />
      <DeleteAccount />
    </div>
  );
}
