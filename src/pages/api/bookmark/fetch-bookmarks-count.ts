import { type NextApiRequest, type NextApiResponse } from "next";
import { type SupabaseClient } from "@supabase/supabase-js";
import isEmpty from "lodash/isEmpty";

import { type BookmarksCountTypes } from "../../../types/apiTypes";
import {
	audioFileTypes,
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	documentFileTypes,
	imageFileTypes,
	instagramType,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	tweetType,
	videoFileTypes,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type Data = {
	data: BookmarksCountTypes | null;
	error: string[] | null;
};

const getCategoryCount = async (
	supabase: SupabaseClient,
	userId: string,
	categoryIds: number[],
	sharedCategories: unknown[],
) => {
	// Count from junction table, filtering out trashed bookmarks
	const buildCategoryPromises = categoryIds.map(async (categoryId) => {
		const { count } = await supabase
			.from(MAIN_TABLE_NAME)
			.select("id, bookmark_categories!inner(category_id)", {
				count: "exact",
				head: true,
			})
			.eq("bookmark_categories.category_id", categoryId)
			.eq("bookmark_categories.user_id", userId)
			.is("trash", null);

		return {
			category_id: categoryId,
			count: count ?? 0,
		};
	});

	const sharedCategoryPromises = sharedCategories.map(
		async (sharedCategory) => {
			const { count } = await supabase
				.from(MAIN_TABLE_NAME)
				.select("id, bookmark_categories!inner(category_id)", {
					count: "exact",
					head: true,
				})
				.eq("bookmark_categories.category_id", sharedCategory)
				.is("trash", null);

			return {
				category_id: sharedCategory,
				count: count ?? 0,
			};
		},
	);

	const [userCategoryResults, sharedCategoryResults] = await Promise.all([
		Promise.all(buildCategoryPromises),
		Promise.all(sharedCategoryPromises),
	]);

	return [...userCategoryResults, ...sharedCategoryResults];
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const email = userData?.data?.user?.email as string;

	let count: BookmarksCountTypes = {
		everything: 0,
		categoryCount: [],
		trash: 0,
		uncategorized: 0,
		images: 0,
		videos: 0,
		links: 0,
		documents: 0,
		tweets: 0,
		instagram: 0,
		audio: 0,
	};

	try {
		const [
			{ count: bookmarkCount },
			{ count: bookmarkImageCount },
			{ count: bookmarkVideoCount },
			{ count: bookmarkDocumentCount },
			{ count: bookmarksLinks },
			{ count: bookmarkTrashCount },
			{ count: bookmarkUnCatCount },
			{ count: bookmarkTweetsCount },
			{ count: bookmarkInstagramCount },
			{ count: bookmarkAudioCount },
			{ data: userCategoryIds },
			{ data: sharedCategoryIds },
		] = await Promise.all([
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.in("type", imageFileTypes),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.in("type", videoFileTypes),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.in("type", documentFileTypes),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.eq("type", bookmarkType),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.not("trash", "is", null),
			// Count from junction table, filtering out trashed (category_id 0 = uncategorized)
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id, bookmark_categories!inner(category_id)", {
					count: "exact",
					head: true,
				})
				.eq("bookmark_categories.category_id", 0)
				.eq("bookmark_categories.user_id", userId)
				.is("trash", null),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.eq("type", tweetType),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.eq("type", instagramType),
			supabase
				.from(MAIN_TABLE_NAME)
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.is("trash", null)
				.or(
					`type.in.(${audioFileTypes}),meta_data->>mediaType.in.(${audioFileTypes})`,
				),
			supabase.from(CATEGORIES_TABLE_NAME).select("id").eq("user_id", userId),
			supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select("category_id")
				.eq("email", email),
		]);

		count = {
			...count,
			everything: bookmarkCount ?? 0,
			images: bookmarkImageCount ?? 0,
			videos: bookmarkVideoCount ?? 0,
			documents: bookmarkDocumentCount ?? 0,
			links: bookmarksLinks ?? 0,
			trash: bookmarkTrashCount ?? 0,
			uncategorized: bookmarkUnCatCount ?? 0,
			tweets: bookmarkTweetsCount ?? 0,
			instagram: bookmarkInstagramCount ?? 0,
			audio: bookmarkAudioCount ?? 0,
		};

		const userCategoryIdsArray = userCategoryIds?.map((item) => item.id) ?? [];
		const sharedCategoryIdsArray =
			sharedCategoryIds?.map((item) => item.category_id) ?? [];

		const categoryCount = (await getCategoryCount(
			supabase,
			userId,
			userCategoryIdsArray,
			sharedCategoryIdsArray,
		)) as BookmarksCountTypes["categoryCount"];

		count = {
			...count,
			categoryCount,
		};
	} catch (error) {
		console.error("Error in API:", error);
		response.status(500).json({ data: null, error: ["Internal Server Error"] });
		return;
	}

	const errorMessages = ["Unauthorized", "Internal Server Error"];

	const nonEmptyErrors = errorMessages.filter((message) => !isEmpty(message));

	response.status(200).json({ data: count, error: nonEmptyErrors });
}
