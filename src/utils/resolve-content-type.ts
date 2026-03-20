import { instagramType, PDF_MIME_TYPE, tweetType } from "./constants";

export type BookmarkContentType =
	| "link"
	| "image"
	| "video"
	| "audio"
	| "document"
	| "tweet"
	| "instagram";

type ResolveContentTypeParams = {
	type?: string | null;
	mediaType?: string | null;
};

/**
 * Resolves a bookmark's content type from available signals.
 * Priority: mediaType (MIME) > explicit type (tweet/instagram) > type (MIME) > default "link".
 */
export function resolveContentType({
	type,
	mediaType,
}: ResolveContentTypeParams): BookmarkContentType {
	// mediaType has highest precedence for MIME-based resolution
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

	// Explicit bookmark types
	if (type === tweetType) {
		return "tweet";
	}

	if (type === instagramType) {
		return "instagram";
	}

	// MIME-based types from `type` field (file uploads store MIME as type)
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

	// Default: regular link/bookmark (covers both OG image and screenshot cases)
	return "link";
}
