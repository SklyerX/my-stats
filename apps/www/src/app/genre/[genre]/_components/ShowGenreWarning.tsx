"use client";

import { XIcon, DatabaseIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { hideGenreWarning } from "../_actions/hide-genre-warning";
import { useState } from "react";

interface Props {
  genre: string;
}

export default function ShowGenreWarning({ genre }: Props) {
  const [show, setShow] = useState<boolean>(true);

  if (!show) return null;

  const handleClick = () => {
    setShow(false);
    hideGenreWarning(genre);
  };

  return (
    <div className="relative mb-5">
      <div className="max-w-7xl mx-auto py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-4 w-4" />
            <span>
              <span className="font-medium">Early Access:</span> This feature is
              actively being developed and our database is growing. Results may
              be limited or change over time.
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Dismiss notice"
            onClick={handleClick}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
