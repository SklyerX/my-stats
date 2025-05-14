export const PRIVACY_FLAGS = {
  CURRENTLY_PLAYING: 1 << 0,
  TOP_GENRES: 1 << 1,
  TOP_ALBUMS: 1 << 2,
  TOP_TRACKS: 1 << 3,
  TOP_ARTISTS: 1 << 4,
  RECENTLY_PLAYED: 1 << 5,
  CONNECTIONS: 1 << 6,
  STREAMING_STATS: 1 << 7,
  PERSONALIZED_MESSAGES: 1 << 8,
  HEATMAP: 1 << 9,
  LONGEST_SESSION: 1 << 10,
  SESSION_ANALYSIS: 1 << 11,
  TOP_TRACKS_IMPORTED: 1 << 12,
  TOP_ARTISTS_IMPORTED: 1 << 13,
  MILESTONES: 1 << 14,
};

export const ALL_FLAGS = Object.values(PRIVACY_FLAGS).reduce(
  (acc, flag) => acc | flag,
  0,
);

export const PRIVACY_OPTIONS = [
  {
    id: PRIVACY_FLAGS.CURRENTLY_PLAYING,
    name: "Currently Playing",
    description: "The track you're currently listening to on Spotify",
  },
  {
    id: PRIVACY_FLAGS.TOP_GENRES,
    name: "Top Genres",
    description: "Your top genres",
  },
  {
    id: PRIVACY_FLAGS.TOP_ALBUMS,
    name: "Top Albums",
    description: "Your top albums",
  },
  {
    id: PRIVACY_FLAGS.TOP_TRACKS,
    name: "Top Tracks",
    description: "Your top tracks",
  },
  {
    id: PRIVACY_FLAGS.TOP_ARTISTS,
    name: "Top Artists",
    description: "Your top artists",
  },
  {
    id: PRIVACY_FLAGS.RECENTLY_PLAYED,
    name: "Recently Played",
    description: "Your top 50 recently played tracks",
  },
  {
    id: PRIVACY_FLAGS.CONNECTIONS,
    name: "Connections",
    description: "Connected social media applications",
  },
  {
    id: PRIVACY_FLAGS.STREAMING_STATS,
    name: "Streaming Stats",
    description:
      "Statistics like minutes streamed, most active hour, hours streamed.",
  },
  {
    id: PRIVACY_FLAGS.PERSONALIZED_MESSAGES,
    name: "Personalized Messages",
    description:
      "Messages tailored to your history such as the 'travelerMessage' and 'mostActiveHour' message",
  },
  {
    id: PRIVACY_FLAGS.HEATMAP,
    name: "Heatmap",
    description: "Yearly heatmap data",
  },
  {
    id: PRIVACY_FLAGS.LONGEST_SESSION,
    name: "Longest Session",
    description: "Longest session analytics and graphs",
  },
  {
    id: PRIVACY_FLAGS.SESSION_ANALYSIS,
    name: "Session Analysis",
    description: "Graphs such as times-of-day and weekday-analysis",
  },
  {
    id: PRIVACY_FLAGS.TOP_TRACKS_IMPORTED,
    name: "Top Tracks - Imported",
    description: "Your top tracks from the imported listening history",
  },
  {
    id: PRIVACY_FLAGS.TOP_ARTISTS_IMPORTED,
    name: "Top Artists - Imported",
    description: "Your top artists from the imported listening history",
  },
  {
    id: PRIVACY_FLAGS.MILESTONES,
    name: "Milestones",
    description: "Your listening milestones (exposed via API)",
  },
];

export function hasPrivacyFlag(userFlags: number, flag: number) {
  return (userFlags & flag) !== 0;
}

export function isDataVisible(userFlags: number, flag: number) {
  return !Boolean(userFlags & flag);
}
