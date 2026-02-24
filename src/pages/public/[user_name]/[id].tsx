import { type GetStaticPaths, type GetStaticProps, type NextPage } from "next";
import { useRouter } from "next/router";
import * as Sentry from "@sentry/nextjs";
import { isEmpty } from "lodash";
import InfiniteScroll from "react-infinite-scroll-component";

import { useFetchPublicCategoryBookmarks } from "../../../async/queryHooks/bookmarks/use-fetch-public-category-bookmarks";
import CardSection from "../../../pageComponents/dashboard/cardSection";
import { type GetPublicCategoryBookmarksApiResponseType } from "../../../types/apiTypes";
import { iconMap } from "../../../utils/commonData";
import {
	BLACK_COLOR,
	FETCH_PUBLIC_CATEGORY_BOOKMARKS_API,
	getBaseUrl,
	NEXT_API_URL,
	WHITE_COLOR,
} from "../../../utils/constants";

type PublicCategoryPageProps = GetPublicCategoryBookmarksApiResponseType;

const CategoryName: NextPage<PublicCategoryPageProps> = (props) => {
	const router = useRouter();
	const categorySlug = router.query.id as string;
	const userName = router.query.user_name as string;

	const { flattenedData, metadata, fetchNextPage, hasNextPage } =
		useFetchPublicCategoryBookmarks({
			categorySlug,
			userName,
			enabled: Boolean(categorySlug) && Boolean(userName),
			initialData: props,
		});

	return (
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
				{!isEmpty(flattenedData) ? (
					<div
						id="scrollableDiv"
						className="overflow-x-hidden overflow-y-auto"
						style={{ height: "calc(100vh - 52px)" }}
					>
						<InfiniteScroll
							dataLength={flattenedData.length}
							endMessage={
								<p className="pb-6 text-center text-plain-reverse">
									Life happens, save it.
								</p>
							}
							hasMore={hasNextPage}
							loader={null}
							next={fetchNextPage}
							scrollableTarget="scrollableDiv"
							style={{ overflow: "unset" }}
						>
							<CardSection
								categoryViewsFromProps={metadata.categoryViews ?? undefined}
								isPublicPage
								listData={flattenedData}
							/>
						</InfiniteScroll>
					</div>
				) : (
					<div className="flex items-center justify-center text-2xl font-semibold">
						There is no data in this collection
					</div>
				)}
			</main>
		</div>
	);
};

export const getStaticPaths: GetStaticPaths = async () => ({
	// Don't pre-generate any pages at build time
	// Pages will be generated on-demand and cached
	paths: [],
	// Generate pages on first request
	fallback: "blocking",
});

export const getStaticProps: GetStaticProps<PublicCategoryPageProps> = async (
	context,
) => {
	const ROUTE = "/public/[user_name]/[id]";
	const categorySlug = context.params?.id as string;
	const userName = context.params?.user_name as string;

	try {
		// Fetch the first full page for SEO and initial render
		const response = await fetch(
			`${getBaseUrl()}${NEXT_API_URL}${FETCH_PUBLIC_CATEGORY_BOOKMARKS_API}?category_slug=${categorySlug}&user_name=${userName}&page=0`,
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
						context: "static_generation",
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

		return {
			props: data,
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
				context: "static_generation",
			},
			extra: { categorySlug, userName },
		});
		return { notFound: true };
	}
};

export default CategoryName;
