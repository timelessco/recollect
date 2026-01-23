import { useMemo } from "react";

import useFetchUserProfile from "../async/queryHooks/user/useFetchUserProfile";
import { type SingleListData } from "../types/apiTypes";

const getDomain = (url: string): string | null => {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();
		return host.startsWith("www.") ? host.slice(4) : host;
	} catch {
		return null;
	}
};

/**
 * Custom hook to get image sources for bookmarks based on user's preferred OG domains
 * Returns an object mapping bookmark IDs to their appropriate image sources
 */
export const useBookmarkImageSources = (
	bookmarks: SingleListData[],
): Record<number, string> => {
	const { userProfileData: profileData } = useFetchUserProfile();

	return useMemo(() => {
		const imageSources: Record<number, string> = {};

		if (!profileData?.data?.[0]?.preferred_og_domains) {
			// No preferred domains, use ogImage for all
			for (const bookmark of bookmarks) {
				imageSources[bookmark.id] = bookmark?.ogImage;
			}

			return imageSources;
		}

		const preferredDomains = profileData.data[0].preferred_og_domains ?? [];
		const preferredDomainSet = new Set(
			preferredDomains.map((domain) => domain.toLowerCase()),
		);

		for (const bookmark of bookmarks) {
			const domain = getDomain(bookmark.url);
			const isPreferred = domain && preferredDomainSet.has(domain);

			imageSources[bookmark.id] = isPreferred
				? (bookmark?.meta_data?.coverImage ?? bookmark?.ogImage)
				: bookmark?.ogImage;
		}

		return imageSources;
	}, [bookmarks, profileData]);
};
