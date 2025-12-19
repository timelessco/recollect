import { isEmpty } from "lodash";

import {
	type BookmarkViewDataTypes,
	type SingleListData,
} from "../../types/apiTypes";
import { type BookmarksViewTypes } from "../../types/componentStoreTypes";
import { viewValues } from "../../utils/constants";
import CardSection from "../dashboard/cardSection";

type DiscoverGuestViewProps = {
	discoverData: SingleListData[];
};

const DiscoverGuestView = ({ discoverData }: DiscoverGuestViewProps) => {
	// Hardcoded view configuration for discover guest view
	const discoverCategoryViews: BookmarkViewDataTypes = {
		bookmarksView: viewValues.moodboard as BookmarksViewTypes,
		moodboardColumns: [30],
		cardContentViewArray: ["cover", "title", "description", "info"],
		sortBy: "date-sort-acending",
	};

	return (
		<div>
			<header className="flex items-center justify-between border-b-[0.5px] border-b-gray-alpha-200 px-6 py-[9px]">
				<div className="flex items-center">
					<p className="text-xl leading-[23px] font-semibold text-gray-900">
						Discover
					</p>
				</div>
			</header>
			<main>
				{!isEmpty(discoverData) ? (
					<CardSection
						categoryViewsFromProps={discoverCategoryViews}
						isBookmarkLoading={false}
						isOgImgLoading={false}
						isPublicPage
						listData={discoverData}
						onDeleteClick={() => {}}
						onMoveOutOfTrashClick={() => {}}
						showAvatar={false}
						userId=""
					/>
				) : (
					<div className="flex items-center justify-center pt-[15%] text-2xl font-semibold">
						There is no data in this collection
					</div>
				)}
			</main>
		</div>
	);
};

export default DiscoverGuestView;
