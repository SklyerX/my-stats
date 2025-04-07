import { z } from "zod";
import type { User } from "@workspace/database/schema";

import { Textarea } from "@workspace/ui/components/textarea";
import { useProfileFormStore } from "@/stores/profile-form";
import { useState } from "react";
import { Label } from "@workspace/ui/components/label";

const MAX_BIO_LENGTH = 150;

const schema = z.object({
  bio: z.string().max(MAX_BIO_LENGTH),
});

interface Props {
  user: Pick<User, "bio">;
}

export default function BioForm({ user }: Props) {
  const { data, setData } = useProfileFormStore();
  const [error, setError] = useState<string | null>(null);

  const displayedBio = data.bio ?? user.bio ?? "";

  const handleChange = (value: string) => {
    const result = schema.safeParse({
      bio: value,
    });

    if (!result.success) {
      const fieldError = result.error.errors[0]?.message || "Invalid bio";
      setError(fieldError);
      return;
    }

    setError(null);
    setData("bio", value);
  };

  const bioLength = displayedBio.length;

  return (
    <div>
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        className="resize-none h-40 mt-1"
        placeholder="Your bio"
        value={displayedBio}
        onChange={({ target }) => handleChange(target.value)}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end mt-2">
        <p className="text-sm text-muted-foreground">
          {bioLength}/{MAX_BIO_LENGTH}
        </p>
      </div>
    </div>
  );
}
