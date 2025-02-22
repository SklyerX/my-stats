import { TIME_RANGE_TEXT } from "@/lib/constants";
import type { TIME_RANGE } from "@/types/spotify";
import { Button } from "@workspace/ui/components/button";
import { Grid2X2, Grid2x2X } from "lucide-react";

interface HeaderProps {
  title: string;
  displayName: string;
  timeRange: TIME_RANGE;
  expanded: boolean;
  updateExpanded: (expanded: boolean) => void;
}

export function Header({
  title,
  displayName,
  timeRange,
  expanded,
  updateExpanded,
}: HeaderProps) {
  return (
    <div className="bg-background sticky w-full z-50 top-0 left-0 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Button
          variant="secondary"
          size="icon"
          onMouseDown={() => updateExpanded(!expanded)}
        >
          {expanded ? (
            <Grid2x2X className="size-5" />
          ) : (
            <Grid2X2 className="size-5" />
          )}
        </Button>
      </div>
      <p className="mt-1 text-muted-foreground">
        {displayName}'s top {title.toLowerCase()} over the past{" "}
        {TIME_RANGE_TEXT[timeRange].toLowerCase()}
      </p>
    </div>
  );
}
