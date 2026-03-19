import { instagramType, PDF_MIME_TYPE, tweetType } from "./constants";

export type BookmarkContentType =
	| "link"
	| "screenshot"
	| "image"
	| "video"
	| "audio"
	| "document"
	| "tweet"
	| "instagram";

type ResolveContentTypeParams = {
	type?: string | null;
	isPageScreenshot?: boolean | null;
	mediaType?: string | null;
};

/**
 * Resolves a bookmark's content type from available signals.
 * Priority: explicit type > MIME type > screenshot flag > default "link".
 */
export function resolveContentType({
	type,
	isPageScreenshot,
	mediaType,
}: ResolveContentTypeParams): BookmarkContentType {
	// Check explicit bookmark types first
	if (type === tweetType) {
		return "tweet";
	}

	if (type === instagramType) {
		return "instagram";
	}

	// Check MIME-based types from `type` field (file uploads store MIME as type)
	if (type?.startsWith("video/")) {
		return "video";
	}

	if (type?.startsWith("audio/")) {
		return "audio";
	}

	if (type === PDF_MIME_TYPE) {
		return "document";
	}

	if (type?.startsWith("image/")) {
		return "image";
	}

	// Check MIME-based types from `mediaType` field (fallback when type is non-MIME like "bookmark")
	if (mediaType?.startsWith("video/")) {
		return "video";
	}

	if (mediaType?.startsWith("audio/")) {
		return "audio";
	}

	if (mediaType === PDF_MIME_TYPE) {
		return "document";
	}

	if (mediaType?.startsWith("image/")) {
		return "image";
	}

	// Screenshot detection
	if (isPageScreenshot) {
		return "screenshot";
	}

	// Default: regular link/bookmark
	return "link";
}
