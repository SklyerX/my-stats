export interface AudioFeatures {
  high_level: {
    happy: { ratio: { happy: number } };
    sad: { ratio: { sad: number } };
    valence: {
      happy: { happy: number };
      sad: { sad: number };
    };
    party: { ratio: { party: number } };
    danceability: { ratio: { danceable: number } };
    acoustic: { ratio: { acoustic: number } };
    relaxed: { ratio: { relaxed: number } };
    timbre: { dark: number; bright: number };
    aggressive: { ratio: { aggressive: number } };
    electronic: { ratio: { electronic: number } };
  };
}

export function calculateValence(happy: number, sad: number): number {
  const valence = happy - sad;
  return ((valence + 1) / 2) * 100;
}

export function extractAudioFeaturePercentages(audioFeatures: AudioFeatures) {
  return {
    happy: audioFeatures.high_level.happy.ratio.happy * 100,
    sad: audioFeatures.high_level.sad.ratio.sad * 100,
    valence: calculateValence(
      audioFeatures.high_level.valence.happy.happy,
      audioFeatures.high_level.valence.sad.sad,
    ),
    party: audioFeatures.high_level.party.ratio.party * 100,
    danceability: audioFeatures.high_level.danceability.ratio.danceable * 100,
    acoustic: audioFeatures.high_level.acoustic.ratio.acoustic * 100,
    relaxed: audioFeatures.high_level.relaxed.ratio.relaxed * 100,
    dark: audioFeatures.high_level.timbre.dark * 100,
    bright: audioFeatures.high_level.timbre.bright * 100,
    aggressive: audioFeatures.high_level.aggressive.ratio.aggressive * 100,
    electronic: audioFeatures.high_level.electronic.ratio.electronic * 100,
  };
}

export function getBarChartFeatures(
  percentages: ReturnType<typeof extractAudioFeaturePercentages>,
) {
  return [
    { label: "Happy", value: percentages.happy },
    { label: "Sad", value: percentages.sad },
    { label: "Valence", value: percentages.valence },
    { label: "Party", value: percentages.party },
    { label: "Danceability", value: percentages.danceability },
    { label: "Acoustic", value: percentages.acoustic },
    { label: "Relaxed", value: percentages.relaxed },
    { label: "Dark", value: percentages.dark },
    { label: "Aggressive", value: percentages.aggressive },
    { label: "Electronic", value: percentages.electronic },
  ];
}

export function getRadarChartData(
  percentages: ReturnType<typeof extractAudioFeaturePercentages>,
) {
  return [
    { characteristic: "Sad", value: percentages.sad },
    { characteristic: "Happy", value: percentages.happy },
    { characteristic: "Party", value: percentages.party },
    { characteristic: "Bright", value: percentages.bright },
    { characteristic: "Relaxed", value: percentages.relaxed },
    { characteristic: "Acoustic", value: percentages.acoustic },
    { characteristic: "Aggressive", value: percentages.aggressive },
    { characteristic: "Electronic", value: percentages.electronic },
    { characteristic: "Danceable", value: percentages.danceability },
  ];
}
