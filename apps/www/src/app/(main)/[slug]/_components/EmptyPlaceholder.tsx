import { TIME_RANGE_TEXT } from "@/lib/constants";
import type { TIME_RANGE } from "@/types/spotify";
import { EyeClosed } from "lucide-react";
import type { JSX } from "react";

interface BaseProps {
  displayName: string;
}

type PropsWithNoTitle = BaseProps & {
  noTitle: true;
  title?: string;
  hideHeader?: boolean;
  timeRange?: never;
};

type PropsWithTitle = BaseProps & {
  noTitle?: false | undefined;
  title: string;
  hideHeader?: boolean;
  timeRange?: TIME_RANGE;
};

type Props = PropsWithNoTitle | PropsWithTitle;

export default function EmptyPlaceholder({
  title,
  displayName,
  hideHeader,
  timeRange,
  noTitle,
}: Props): JSX.Element {
  return (
    <div>
      {!hideHeader && title && (
        <div className="bg-background sticky w-full z-50 top-0 left-0 py-2">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-muted-foreground font-medium">
            {displayName}'s {title.toLowerCase()} over the past{" "}
            {timeRange && TIME_RANGE_TEXT[timeRange].toLowerCase()}
          </p>
        </div>
      )}
      {hideHeader && !noTitle && (
        <h2 className="text-2xl font-semibold">{title}</h2>
      )}
      <div className="w-full h-52 flex flex-col items-center justify-center">
        <EyeClosed className="size-5" />
        <p className="text-muted-foreground">
          {displayName} does not share this data
        </p>
      </div>
    </div>
  );
}
