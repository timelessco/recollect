import {
  AUDIO_MIME_PREFIX,
  AUDIO_URL,
  DOCUMENT_MIME_TYPES,
  DOCUMENTS_URL,
  IMAGE_MIME_PREFIX,
  IMAGES_URL,
  VIDEO_MIME_PREFIX,
  VIDEOS_URL,
} from "./constants";

export const BOOKMARK_MEDIA_CATEGORY_PREDICATES = {
  [IMAGES_URL]: `type.like.${IMAGE_MIME_PREFIX}%,meta_data->>mediaType.like.${IMAGE_MIME_PREFIX}%`,
  [VIDEOS_URL]: `type.like.${VIDEO_MIME_PREFIX}%,meta_data->>mediaType.like.${VIDEO_MIME_PREFIX}%`,
  [AUDIO_URL]: `type.like.${AUDIO_MIME_PREFIX}%,meta_data->>mediaType.like.${AUDIO_MIME_PREFIX}%`,
  [DOCUMENTS_URL]: `type.in.(${DOCUMENT_MIME_TYPES.join(",")}),meta_data->>mediaType.in.(${DOCUMENT_MIME_TYPES.join(",")})`,
} as const;

export function getBookmarkMediaCategoryPredicate(
  categoryId: string | null | undefined,
): string | null {
  if (!categoryId) {
    return null;
  }

  return (
    BOOKMARK_MEDIA_CATEGORY_PREDICATES[
      categoryId as keyof typeof BOOKMARK_MEDIA_CATEGORY_PREDICATES
    ] ?? null
  );
}
