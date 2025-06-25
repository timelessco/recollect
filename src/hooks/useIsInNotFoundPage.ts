import { useRouter } from "next/router";
import { isNull } from "lodash";

import { ALL_BOOKMARKS_URL } from "../utils/constants";

import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

// tells if the user is in a not found page , eg ...co/testing
export default function useIsInNotFoundPage() {
	const router = useRouter();

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const categorySlug = router?.asPath?.split("/")[1].split("?")[0] || null;

	if (!isNull(CATEGORY_ID)) {
		return { isInNotFoundPage: false };
	} else if (categorySlug?.startsWith(ALL_BOOKMARKS_URL)) {
		return { isInNotFoundPage: false };
	} else {
		return { isInNotFoundPage: true };
	}
}
