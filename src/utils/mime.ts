import { bookmarkType, isAcceptedMimeType } from "./constants";

export function normalizeUploadedMimeType(mimeType: null | string | undefined): string {
  if (!mimeType) {
    return bookmarkType;
  }

  const normalizedMimeType = mimeType.toLowerCase();

  if (!isAcceptedMimeType(normalizedMimeType)) {
    return bookmarkType;
  }

  return normalizedMimeType;
}
