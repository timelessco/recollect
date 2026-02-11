import {
	DISCOVER_URL,
	IMAGES_URL,
	LINKS_URL,
	VIDEOS_URL,
} from "../../utils/constants";

import { DiscoverBookmarkCards } from "./discoverBookmarkCards";
import NotFoundPage from "../notFoundPage";

type DashboardMainPaneProps = {
	categorySlug: string | null;
	isInNotFoundPage: boolean;
	isLoadingCategories: boolean;
	isFetchingCategories: boolean;
	bookmarksPane: React.ReactNode;
};

export function DashboardMainPane({
	categorySlug,
	isInNotFoundPage,
	isLoadingCategories,
	isFetchingCategories,
	bookmarksPane,
}: DashboardMainPaneProps) {
	if (!isInNotFoundPage) {
		switch (categorySlug) {
			case DISCOVER_URL:
				return <DiscoverBookmarkCards />;
			case IMAGES_URL:
			case VIDEOS_URL:
			case LINKS_URL:
				return <>{bookmarksPane}</>;
			case null:
				return <>{bookmarksPane}</>;
			default:
				return <>{bookmarksPane}</>;
		}
	}

	if (isLoadingCategories || isFetchingCategories) {
		return <>Loading</>;
	}

	return <NotFoundPage />;
}
