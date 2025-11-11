import { type GetServerSideProps, type NextPage } from "next";
import axios from "axios";
import { find, isEmpty, isNull } from "lodash";

import CardSection from "../../pageComponents/dashboard/cardSection";
import {
	type GetPublicCategoryBookmarksApiResponseType,
	type SingleListData,
} from "../../types/apiTypes";
import { options } from "../../utils/commonData";
import {
	colorPickerColors,
	FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
	getBaseUrl,
	NEXT_API_URL,
} from "../../utils/constants";

// this renders a public category page

type PublicCategoryPageProps = GetPublicCategoryBookmarksApiResponseType;

const CategoryName: NextPage<PublicCategoryPageProps> = (props) => (
	<div>
		<header className="border-b-gray-alpha-200 flex items-center justify-between border-b-[0.5px] px-6 py-[9px]">
			<div className="flex items-center">
				<div
					className="mr-2 flex items-center justify-center rounded-full p-0.5"
					style={{
						width: 20,
						height: 20,
						backgroundColor: props?.icon_color ?? colorPickerColors[1],
					}}
				>
					{find(options(), (item) => item?.label === props?.icon)?.icon(
						props?.icon_color === colorPickerColors[0]
							? colorPickerColors[1]
							: colorPickerColors[0],
						"14",
					)}
				</div>
				<p className="text-xl font-semibold leading-[23px] text-gray-900">
					{props.category_name}
				</p>
			</div>
		</header>
		<main className="overflow-y-scroll">
			{!isEmpty(props?.data) ? (
				<CardSection
					categoryViewsFromProps={props?.category_views ?? undefined}
					deleteBookmarkId={undefined}
					isBookmarkLoading={false}
					isOgImgLoading={false}
					isPublicPage
					listData={props?.data as SingleListData[]}
					onBulkBookmarkDelete={() => {}}
					onCategoryChange={() => {}}
					onDeleteClick={() => {}}
					onEditClick={() => {}}
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

export const getServerSideProps: GetServerSideProps = async (context) => {
	const response = await axios.post<GetPublicCategoryBookmarksApiResponseType>(
		`${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${
			context?.query?.id as string
		}&user_name=${context?.query?.category_id as string}`,
	);

	if (!response?.data?.is_public) {
		// this page is not a public page
		return {
			notFound: true,
		};
	}

	if (isEmpty(response?.data?.data) || isNull(response?.data?.data)) {
		return {
			props: {
				data: response?.data?.data,
				category_views: response?.data?.category_views,
				icon: response?.data?.icon,
				icon_color: response?.data?.icon_color,
				category_name: response?.data?.category_name,
			},
		};
	}

	return {
		props: {
			data: response?.data?.data,
			category_views: response?.data?.category_views,
			icon: response?.data?.icon,
			icon_color: response?.data?.icon_color,
			category_name: response?.data?.category_name,
		},
	};
};

export default CategoryName;
