"use client";

import { motion } from "framer-motion";
import { Track, type TrackProps } from "../Track";
import { Album, type AlbumProps } from "../Album";
import { Artist, type ArtistProps } from "../Artist";

export function AnimatedTrack(props: TrackProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: props.index * 0.1 }}
    >
      <Track {...props} />
    </motion.div>
  );
}

export function AnimatedAlbum(props: AlbumProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: props.index * 0.1 }}
    >
      <Album {...props} />
    </motion.div>
  );
}

export function AnimatedArtist(props: ArtistProps) {
  return (
    <motion.div
      initial={{ y: 25, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.05 + props.index * 0.1 }}
    >
      <Artist {...props} />
    </motion.div>
  );
}
