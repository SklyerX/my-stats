import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import type { User } from "@workspace/database/schema";

import { z } from "zod";
import { useProfileFormStore } from "@/stores/profile-form";
import { useState } from "react";

const schema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(30, "Slug cannot exceed 30 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(20, "Username cannot exceed 20 characters"),
});

type FormErrors = {
  [K in keyof z.infer<typeof schema>]?: string;
};

interface Props {
  user: Pick<User, "slug" | "username">;
}

interface Props {
  user: Pick<User, "slug" | "username">;
}

export default function ProfileForm({ user }: Props) {
  const { setData } = useProfileFormStore();
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = (key: "slug" | "username", value: string) => {
    const fieldSchema = z.object({ [key]: schema.shape[key] });
    const { error, success } = fieldSchema.safeParse({ [key]: value });

    if (!success) {
      const fieldError = error.errors[0]?.message || `Invalid ${key}`;
      setErrors((prev) => ({ ...prev, [key]: fieldError }));
      return;
    }

    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setData(key, value);
  };

  return (
    <div className="space-y-3 w-full">
      <div className="space-y-1">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          defaultValue={user.username}
          type="text"
          onChange={({ target }) => handleChange("username", target.value)}
        />
        <div className="h-3">
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Slug</Label>
        <div className="flex rounded-md shadow-xs">
          <span className="border-input bg-background text-muted-foreground -z-10 inline-flex items-center rounded-s-md border px-3 text-sm">
            http://localhost:3000/
          </span>
          <Input
            id="slug"
            defaultValue={user.slug}
            className="-ms-px rounded-s-none shadow-none"
            onChange={({ target }) => handleChange("slug", target.value)}
            type="text"
          />
        </div>
        <div className="h-3">
          {errors.slug && (
            <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
          )}
        </div>
      </div>
    </div>
  );
}
