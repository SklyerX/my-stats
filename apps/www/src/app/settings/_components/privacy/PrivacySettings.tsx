"use client";

import { PRIVACY_OPTIONS } from "@/lib/flags";
import type { User } from "@workspace/database/schema";
import React, { useState } from "react";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { toast } from "@workspace/ui/components/sonner";
import { updatePrivacyFlagAction } from "../../_actions/update-flags";

interface Props {
  initialFlags: User["flags"];
}

export default function PrivacySettings({ initialFlags }: Props) {
  const [flags, setFlags] = useState<number>(initialFlags);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const isVisible = (flag: number) => {
    return !(flags & flag);
  };

  const toggleOption = (flag: number) => {
    const newFlag = flags ^ flag;
    setFlags(newFlag);
    setIsDirty(true);
  };

  const handleSave = () => {
    if (isDirty) {
      setIsDirty(false);
      toast.promise(updatePrivacyFlagAction(flags), {
        loading: "Updating privacy settings...",
        success: "Settings updated.",
        error: "Something went wrong while updating privacy settings",
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-3xl font-semibold">Privacy</h3>
        <Button disabled={!isDirty} onClick={handleSave} className="mb-4">
          Save
        </Button>
      </div>
      <div className="space-y-6">
        {PRIVACY_OPTIONS.map((option) => (
          <div key={option.id} className="flex items-start justify-between">
            <div className="pr-4">
              <h3 className="font-medium">{option.name}</h3>
              <p className="text-sm text-gray-500">{option.description}</p>
            </div>
            <Switch
              checked={isVisible(option.id)}
              onCheckedChange={() => toggleOption(option.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
