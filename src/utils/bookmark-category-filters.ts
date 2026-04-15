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
  [AUDIO_URL]: `type.like.${AUDIO_MIME_PREFIX}%,meta_data->>mediaType.like.${AUDIO_MIME_PREFIX}%`,
  [DOCUMENTS_URL]: `type.in.(${DOCUMENT_MIME_TYPES.join(",")}),meta_data->>mediaType.in.(${DOCUMENT_MIME_TYPES.join(",")})`,
  [IMAGES_URL]: `type.like.${IMAGE_MIME_PREFIX}%,meta_data->>mediaType.like.${IMAGE_MIME_PREFIX}%`,
  [VIDEOS_URL]: `type.like.${VIDEO_MIME_PREFIX}%,meta_data->>mediaType.like.${VIDEO_MIME_PREFIX}%`,
} as const;

function isMediaCategoryKey(key: string): key is keyof typeof BOOKMARK_MEDIA_CATEGORY_PREDICATES {
  return key in BOOKMARK_MEDIA_CATEGORY_PREDICATES;
}

export function getBookmarkMediaCategoryPredicate(
  categoryId: null | string | undefined,
): null | string {
  if (!categoryId) {
    return null;
  }

  if (isMediaCategoryKey(categoryId)) {
    return BOOKMARK_MEDIA_CATEGORY_PREDICATES[categoryId];
  }

  return null;
}
