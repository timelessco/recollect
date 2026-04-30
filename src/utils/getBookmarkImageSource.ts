import { useMemo } from "react";

import type { SingleListData } from "../types/apiTypes";

import useFetchUserProfile from "../async/queryHooks/user/use-fetch-user-profile";
import { isBookmarkEnrichmentDone } from "../lib/bookmarks/enrichment-phase";
import { getDomain } from "./domain";

/**
 * Pick the best image source for a bookmark.
 *
 * Pre-t3 (no `meta_data.ocr_status`): the screenshot is the freshest
 * representation, so it wins over the t1 scraper OG image. Post-t3:
 * enrichment has repopulated `ogImage`/`coverImage` so normal precedence
 * applies. See `isBookmarkEnrichmentDone` for the t1→t2→t3 pipeline.
 */
export function getImgForPost(
  post: SingleListData,
  preferredDomainsSet: Set<string>,
): string | undefined {
  const postOgImage = post?.ogImage;
  const postCoverImage = post?.meta_data?.coverImage;
  const postScreenshot = post?.meta_data?.screenshot ?? undefined;
  const enrichmentDone = isBookmarkEnrichmentDone(post?.meta_data);

  if (preferredDomainsSet.size === 0) {
    return enrichmentDone ? postOgImage : (postScreenshot ?? postOgImage);
  }

  const domain = getDomain(post?.url ?? "");
  const isPreferred = domain && preferredDomainsSet.has(domain);

  if (enrichmentDone) {
    return isPreferred ? (postCoverImage ?? postOgImage) : postOgImage;
  }
  return isPreferred
    ? (postScreenshot ?? postCoverImage ?? postOgImage)
    : (postScreenshot ?? postOgImage);
}

/**
 * Returns the user's preferred OG-image domains as a lowercase Set.
 * Pair with `getImgForPost` to resolve a bookmark's best image source.
 */
export function usePreferredDomainsSet(): Set<string> {
  const { userProfileData: profileData } = useFetchUserProfile();
  return useMemo(() => {
    const domains = profileData?.[0]?.preferred_og_domains ?? [];
    return new Set(domains.map((domain) => domain.toLowerCase()));
  }, [profileData]);
}
