import type { SingleListData } from "../../types/apiTypes";
import type { Slide as BaseSlide } from "yet-another-react-lightbox";

import { ESCAPE_REGEXP_PATTERN, YOUTU_BE, YOUTUBE_COM } from "../../utils/constants";

const SPOTIFY_HOST = "open.spotify.com";

type SpotifyContentType = "album" | "artist" | "episode" | "playlist" | "show" | "track";

const SPOTIFY_CONTENT_TYPES: ReadonlySet<string> = new Set<SpotifyContentType>([
  "album",
  "artist",
  "episode",
  "playlist",
  "show",
  "track",
]);

function isSpotifyContentType(value: string): value is SpotifyContentType {
  return SPOTIFY_CONTENT_TYPES.has(value);
}

/**
 * Parses a Spotify URL into its content type and ID.
 * Returns null if the URL is not a valid Spotify content URL.
 */
function parseSpotifyUrl(
  urlString: null | string | undefined,
): { id: string; type: SpotifyContentType } | null {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString);
    if (url.hostname !== SPOTIFY_HOST) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2 || !isSpotifyContentType(segments[0])) {
      return null;
    }

    return { id: segments[1], type: segments[0] };
  } catch {
    return null;
  }
}

/**
 * Checks if a given URL is a Spotify content URL
 * Supports tracks, albums, playlists, episodes, shows, and artists
 */
export function isSpotifyLink(urlString: null | string | undefined): boolean {
  return parseSpotifyUrl(urlString) !== null;
}

/**
 * Spotify embed heights per content type
 */
const SPOTIFY_EMBED_HEIGHTS: Record<SpotifyContentType, number> = {
  album: 352,
  artist: 352,
  episode: 232,
  playlist: 352,
  show: 352,
  track: 152,
};

/**
 * Transforms a Spotify content URL into an embeddable iframe URL.
 * Returns the embed URL and appropriate iframe height for the content type.
 */
export function getSpotifyEmbedInfo(urlString: string): {
  embedUrl: string;
  height: number;
} | null {
  const parsed = parseSpotifyUrl(urlString);
  if (!parsed) {
    return null;
  }

  return {
    embedUrl: `https://${SPOTIFY_HOST}/embed/${parsed.type}/${parsed.id}`,
    height: SPOTIFY_EMBED_HEIGHTS[parsed.type],
  };
}

/**
 * Checks if a given URL is a YouTube video URL
 * Supports standard YouTube URLs, short URLs (youtu.be), embeds, and shorts
 * @param urlString - The URL to check
 * @returns boolean - True if the URL is a YouTube video
 */
export const isYouTubeVideo = (urlString: null | string | undefined): boolean => {
  if (!urlString) {
    return false;
  }

  try {
    const url = new URL(urlString);
    const host = url?.hostname;

    // Match video URLs only
    if (host === YOUTU_BE) {
      return Boolean(url?.pathname?.slice(1));
    }

    if (host === `www.${YOUTUBE_COM}` || host === YOUTUBE_COM) {
      if (url?.pathname === "/watch" && url?.searchParams.has("v")) {
        return true;
      }

      if (url?.pathname?.startsWith(`/embed/`)) {
        return true;
      }

      if (url?.pathname?.startsWith("/shorts/") && url?.pathname?.split("/")[2]) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Custom slide type that extends the base Slide with bookmark data
 * This allows the plugin to access bookmark metadata directly from slides
 * without needing global state or additional queries
 */
export type CustomSlide = BaseSlide & {
  data?: {
    /**
     * The full bookmark object for this slide
     */
    bookmark?: SingleListData;
    /**
     * Legacy type field (kept for backwards compatibility)
     */
    type?: string;
  };
  placeholder?: string;
};

export const highlightSearch = (text: string, search: string): (React.ReactNode | string)[] => {
  if (!text || !search) {
    return [text ?? ""];
  }

  const escaped = search.replaceAll(ESCAPE_REGEXP_PATTERN, "\\$&");
  const regex = new RegExp(`(${escaped})`, "iu");

  // Return JSX with <mark> tags
  const parts = text.split(regex);

  return parts.map((part, index) =>
    // Captured groups appear at odd indices after split
    index % 2 === 1 ? (
      // oxlint-disable-next-line react/no-array-index-key
      <span className="bg-yellow-300" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      part
    ),
  );
};
