import { instagramType, PDF_MIME_TYPE, tweetType } from "@/utils/constants";

export type BookmarkContentType =
  | "link"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "tweet"
  | "instagram";

interface ResolveContentTypeParams {
  type?: string | null;
  mediaType?: string | null;
}

/**
 * Resolves a bookmark's content type from available signals.
 * Priority: explicit type (tweet/instagram) > MIME (mediaType ?? type) > default "link".
 */
export function resolveContentType({
  type,
  mediaType,
}: ResolveContentTypeParams): BookmarkContentType {
  // Explicit bookmark types (never MIME strings)
  if (type === tweetType) {
    return "tweet";
  }

  if (type === instagramType) {
    return "instagram";
  }

  // MIME-based resolution — mediaType takes precedence, fall back to type
  const mime = mediaType ?? type;

  if (mime?.startsWith("video/")) {
    return "video";
  }

  if (mime?.startsWith("audio/")) {
    return "audio";
  }

  if (mime === PDF_MIME_TYPE) {
    return "document";
  }

  if (mime?.startsWith("image/")) {
    return "image";
  }

  return "link";
}
