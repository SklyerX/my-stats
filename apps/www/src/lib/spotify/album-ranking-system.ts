import type {
  SpotifyImage,
  Track,
  PlaylistItem,
  RecentlyPlayedResponse,
  SimplifiedArtist,
} from "@/types/spotify";
import { timeDifference } from "../utils";

interface AlbumStats {
  id: string;
  name: string;
  artists: SimplifiedArtist[];
  images: SpotifyImage[];
  totalPlayCount: number;
  recentPlayCount: number;
  playlistOccurrences: number;
  savedTracks: number;
  lastPlayedAt: Date | null;
  score: number;
  occurrences: number;
}

interface TopTrack extends Track {
  position: number;
}

const buildDefaultState = ({
  albumId,
  images,
  name,
  artists,
}: {
  name: string;
  albumId: string;
  images: SpotifyImage[];
  artists: SimplifiedArtist[];
}): AlbumStats => ({
  id: albumId,
  images,
  name,
  artists,
  lastPlayedAt: null,
  occurrences: 0,
  playlistOccurrences: 0,
  recentPlayCount: 0,
  savedTracks: 0,
  score: 0,
  totalPlayCount: 0,
});

export class AlbumRankingSystem {
  private readonly IN_PLAYLIST_MULTIPLIER = 0.3;
  private readonly TOP_TRACK_MULTIPLIER = 0.2;
  private readonly SAVED_TRACK_MULTIPLIER = 0.2;
  private readonly RECENTLY_PLAYED_MULTIPLIER = 0.3;

  async getTopAlbums({
    topTracks,
    savedTracks,
    playlists,
    recentlyPlayed,
  }: {
    topTracks: TopTrack[];
    savedTracks: Track[];
    playlists: PlaylistItem[];
    recentlyPlayed: RecentlyPlayedResponse["items"];
  }) {
    const albums = new Map<string, AlbumStats>();

    playlists.map((playlist) => {
      const track = playlist.track;
      const album = track.album;

      const albumData = albums.get(album.id);

      if (albumData) {
        albumData.occurrences += 1;
        albumData.score += 1 * this.IN_PLAYLIST_MULTIPLIER;
      } else {
        albums.set(
          playlist.track.album.id,
          buildDefaultState({
            albumId: playlist.track.album.id,
            images: playlist.track.album.images,
            name: playlist.track.album.name,
            artists: playlist.track.album.artists,
          }),
        );
      }
    });

    topTracks.map((track) => {
      const album = track.album;
      const albumData = albums.get(album.id);

      if (albumData) {
        albumData.occurrences += 1;
        albumData.score += (51 - track.position) * this.TOP_TRACK_MULTIPLIER;
      } else {
        // When creating a new album entry from playlists:
        const newAlbum = buildDefaultState({
          albumId: album.id,
          images: album.images,
          name: album.name,
          artists: album.artists,
        });

        newAlbum.occurrences = 1;
        newAlbum.score = 1 * this.IN_PLAYLIST_MULTIPLIER;
        albums.set(album.id, newAlbum);
      }
    });

    savedTracks.map((track) => {
      const album = track.album;
      const albumData = albums.get(album.id);

      if (albumData) {
        albumData.occurrences += 1;
        albumData.savedTracks += 1;
        albumData.score += albumData.score * this.SAVED_TRACK_MULTIPLIER;
      } else {
        albums.set(
          album.id,
          buildDefaultState({
            albumId: album.id,
            images: album.images,
            name: album.name,
            artists: album.artists,
          }),
        );
      }
    });

    recentlyPlayed.map((item) => {
      const track = item.track;
      const album = track.album;
      const albumData = albums.get(album.id);

      if (albumData) {
        albumData.occurrences += 1;
        albumData.recentPlayCount += 1;

        const diff = timeDifference(new Date(item.played_at));

        if (diff.hours < 6)
          albumData.score += 1 * this.RECENTLY_PLAYED_MULTIPLIER;
        if (diff.days < 1)
          albumData.score += 0.5 * this.RECENTLY_PLAYED_MULTIPLIER;
        if (diff.days < 2)
          albumData.score += 0.2 * this.RECENTLY_PLAYED_MULTIPLIER;
      }
    });

    return Array.from(albums.values()).sort((a, b) => b.score - a.score);
  }
}
