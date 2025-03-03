export class MusicBrainzAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "MusicBrainzAPIError";
  }
}

export class AcousticBrainzAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "AcousticBrainzAPIError";
  }
}

export class NoMusicBrainzDataError extends Error {
  constructor(isrc: string) {
    super(`No MusicBrainz data found for ISRC: ${isrc}`);
    this.name = "NoMusicBrainzDataError";
  }
}

export class NoAcousticBrainzDataError extends Error {
  constructor(mbid: string) {
    super(`No AcousticBrainz data found for MBID: ${mbid}`);
    this.name = "NoAcousticBrainzDataError";
  }
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
