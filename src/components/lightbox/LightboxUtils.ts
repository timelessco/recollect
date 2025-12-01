import { type Slide as BaseSlide } from "yet-another-react-lightbox";

import { YOUTU_BE, YOUTUBE_COM } from "../../utils/constants";

/**
 * Checks if a given URL is a YouTube video URL
 * Supports standard YouTube URLs, short URLs (youtu.be), embeds, and shorts
 * @param urlString - The URL to check
 * @returns boolean - True if the URL is a YouTube video
 */
export const isYouTubeVideo = (
	urlString: string | null | undefined,
): boolean => {
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

			if (
				url?.pathname?.startsWith("/shorts/") &&
				url?.pathname?.split("/")[2]
			) {
				return true;
			}
		}

		return false;
	} catch {
		return false;
	}
};

export type CustomSlide = BaseSlide & {
	data?: {
		type?: string;
	};
	placeholder?: string;
};
