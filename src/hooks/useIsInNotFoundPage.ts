import { useRouter } from "next/router";
import { isNull } from "lodash";

import { ALL_BOOKMARKS_URL } from "../utils/constants";
import { getCategorySlugFromRouter } from "../utils/url";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

// tells if the user is in a not found page , eg ...co/testing
export default function useIsInNotFoundPage() {
	const router = useRouter();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const categorySlug = getCategorySlugFromRouter(router);

	if (!isNull(CATEGORY_ID)) {
		return { isInNotFoundPage: false };
	} else if (categorySlug?.split("/")[0] === ALL_BOOKMARKS_URL) {
		return { isInNotFoundPage: false };
	} else {
		return { isInNotFoundPage: true };
	}
}
