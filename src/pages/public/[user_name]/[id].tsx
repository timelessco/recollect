import { type GetServerSideProps, type NextPage } from "next";
import * as Sentry from "@sentry/nextjs";
import { isEmpty, isNull } from "lodash";

import CardSection from "../../../pageComponents/dashboard/cardSection";
import {
	type GetPublicCategoryBookmarksApiResponseType,
	type SingleListData,
} from "../../../types/apiTypes";
import { iconMap } from "../../../utils/commonData";
import {
	BLACK_COLOR,
	FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
	getBaseUrl,
	NEXT_API_URL,
	WHITE_COLOR,
} from "../../../utils/constants";

type PublicCategoryPageProps = GetPublicCategoryBookmarksApiResponseType;

const CategoryName: NextPage<PublicCategoryPageProps> = (props) => (
	<div>
		<header className="flex items-center justify-between border-b-[0.5px] border-b-gray-alpha-200 px-6 py-[9px]">
			<div className="flex items-center">
				<div
					className="mr-2 flex items-center justify-center rounded-full p-0.5"
					style={{
						width: 20,
						height: 20,
						backgroundColor: props?.icon_color ?? BLACK_COLOR,
					}}
				>
					{props?.icon &&
						iconMap
							.get(props.icon)
							?.icon(
								props?.icon_color === WHITE_COLOR ? BLACK_COLOR : WHITE_COLOR,
								"14",
							)}
				</div>
				<p className="text-xl leading-[23px] font-semibold text-gray-900">
					{props.category_name}
				</p>
			</div>
		</header>
		<main>
			{!isEmpty(props?.data) ? (
				<div
					id="scrollableDiv"
					className="overflow-x-hidden overflow-y-auto"
					style={{ height: "calc(100vh - 52px)" }}
				>
					<CardSection
						categoryViewsFromProps={props?.category_views ?? undefined}
						isBookmarkLoading={false}
						isOgImgLoading={false}
						isPublicPage
						listData={props?.data as SingleListData[]}
						showAvatar={false}
						userId=""
					/>
				</div>
			) : (
				<div className="flex items-center justify-center pt-[15%] text-2xl font-semibold">
					There is no data in this collection
				</div>
			)}
		</main>
	</div>
);

export const getServerSideProps: GetServerSideProps = async (context) => {
	const ROUTE = "/public/[user_name]/[id]";
	const categorySlug = context.query.id;
	const userName = context.query.user_name;

	try {
		const response = await fetch(
			`${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${categorySlug}&user_name=${userName}`,
		);

		if (!response.ok) {
			console.error(
				`[${ROUTE}] Failed to fetch public category bookmarks: HTTP ${response.status}`,
				{
					status: response.status,
					statusText: response.statusText,
					categorySlug,
					userName,
				},
			);
			Sentry.captureException(
				new Error(`HTTP ${response.status}: ${response.statusText}`),
				{
					tags: {
						operation: "fetch_public_category",
						context: "server_side_rendering",
					},
					extra: {
						status: response.status,
						statusText: response.statusText,
						categorySlug,
						userName,
					},
				},
			);
			return { notFound: true };
		}

		const data =
			(await response.json()) as GetPublicCategoryBookmarksApiResponseType;

		if (!data?.is_public) {
			console.warn(`[${ROUTE}] Category is not public`, {
				categorySlug,
				userName,
			});
			return { notFound: true };
		}

		if (isEmpty(data?.data) || isNull(data?.data)) {
			return {
				props: {
					data: data?.data,
					category_views: data?.category_views,
					icon: data?.icon,
					icon_color: data?.icon_color,
					category_name: data?.category_name,
				},
			};
		}

		return {
			props: {
				data: data?.data,
				category_views: data?.category_views,
				icon: data?.icon,
				icon_color: data?.icon_color,
				category_name: data?.category_name,
			},
		};
	} catch (error) {
		// Network failures, API errors are system errors (5xx) - console.error + Sentry
		console.error(`[${ROUTE}] Failed to fetch public category bookmarks`, {
			error,
			categorySlug,
			userName,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "fetch_public_category",
				context: "server_side_rendering",
			},
			extra: { categorySlug, userName },
		});
		return { notFound: true };
	}
};

export default CategoryName;
