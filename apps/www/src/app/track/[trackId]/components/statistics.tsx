import React from "react";
import { Progress } from "@workspace/ui/components/progress";
import {
  extractAudioFeaturePercentages,
  getBarChartFeatures,
  type AudioFeatures as AudioFeaturesType,
} from "@/lib/audio-features-utils";
import { cn } from "@workspace/ui/lib/utils";

interface Props {
  audioFeatures: AudioFeaturesType;
  className?: string;
}

export default function AudioFeatures({
  audioFeatures,
  className = "",
}: Props) {
  const percentages = extractAudioFeaturePercentages(audioFeatures);
  const featureOrder = getBarChartFeatures(percentages);

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="w-full space-y-1">
        {featureOrder.map((feature) => (
          <div key={feature.label} className="w-full">
            <div className="flex justify-between mb-1">
              <span>{feature.label}</span>
              <span className="text-sm text-gray-400">
                {Math.round(feature.value)}%
              </span>
            </div>
            <Progress value={Math.min(Math.max(feature.value, 0), 100)} />
          </div>
        ))}
      </div>
    </div>
  );
}
