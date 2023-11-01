import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";

import { type BookmarksCountTypes } from "../../../types/apiTypes";
import {
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	imageFileTypes,
	MAIN_TABLE_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	videoFileTypes,
} from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// get all bookmarks count

type Data = {
	data: BookmarksCountTypes | null;
	error: PostgrestError | unknown[] | VerifyErrors | string | null;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const accessToken = request.query.access_token as string;

	const supabase = apiSupabaseClient();

	// let decode: { sub: string };

	let userId: string | (() => string) | undefined;
	let email: string | (() => string) | undefined;

	const { error: _error, decoded } = verifyAuthToken(accessToken);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	} else {
		userId = decoded?.sub;
		email = decoded?.email;
	}

	let count = {
		allBookmarks: 0,
		categoryCount: [],
		trash: 0,
		uncategorized: 0,
		images: 0,
		videos: 0,
		links: 0,
	} as BookmarksCountTypes;

	const { error: bookError, count: bookmarkCount } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
    id
  `,
			{ count: "exact", head: true },
		)
		.eq("user_id", userId)
		// this is for '/' (root-page) route , we need bookmakrs by user_id
		// TODO: check and remove
		.eq("trash", false);

	count = {
		...count,
		allBookmarks: bookmarkCount ?? (0 as number),
	};

	const { error: bookImageError, count: bookmarkImageCount } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
	id
`,
			{ count: "exact", head: true },
		)
		.eq("user_id", userId)
		.eq("trash", false)
		.in("type", imageFileTypes);

	count = {
		...count,
		images: bookmarkImageCount ?? (0 as number),
	};

	const { error: bookVideoError, count: bookmarkVideoCount } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
id
`,
			{ count: "exact", head: true },
		)
		.eq("user_id", userId)
		.eq("trash", false)
		.in("type", videoFileTypes);

	count = {
		...count,
		videos: bookmarkVideoCount ?? (0 as number),
	};

	const { error: bookmakrsLinksError, count: bookmakrsLinks } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
id
`,
			{ count: "exact", head: true },
		)
		.eq("user_id", userId)
		.eq("trash", false)
		.eq("type", bookmarkType);

	count = {
		...count,
		links: bookmakrsLinks ?? (0 as number),
	};

	const { error: bookTrashError, count: bookmarkTrashCount } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
    id
  `,
			{ count: "exact", head: true },
		)
		.eq("user_id", userId)
		// this is for '/' (root-page) route , we need bookmakrs by user_id
		// TODO: check and remove
		.eq("trash", true);

	count = {
		...count,
		trash: bookmarkTrashCount ?? (0 as number),
	};

	const { error: bookUnCatError, count: bookmarkUnCatCount } = await supabase
		.from(MAIN_TABLE_NAME)
		.select(
			`
    id
  `,
			{ count: "exact", head: true },
		)
		.eq("user_id", userId)
		.eq("trash", false)
		// this is for '/' (root-page) route , we need bookmakrs by user_id // TODO: check and remove
		.eq("category_id", 0);

	count = {
		...count,
		uncategorized: bookmarkUnCatCount ?? (0 as number),
	};

	// category count
	// get all user category ids
	const { data: userCategoryIds, error: categoryError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(
			`
    id
  `,
		)
		.eq("user_id", userId);

	const { data: sharedCategoryIds, error: sharedCategoryError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.select(
			`
	category_id
`,
		)
		.eq("email", email);

	const buildCategoryPromises = userCategoryIds?.map(async (item) => {
		const { count: bookmarkCountData } = await supabase
			.from(MAIN_TABLE_NAME)
			.select(
				`
						id
					`,
				{ count: "exact", head: true },
			)
			.eq("category_id", item?.id)
			.eq("trash", false);

		return {
			category_id: item?.id as number,
			count: bookmarkCountData ?? (0 as number),
		};
	});

	const sharedCategoryPromises = sharedCategoryIds?.map(
		async (sharedCategory) => {
			const { count: sharedBookmarkCountData } = await supabase
				.from(MAIN_TABLE_NAME)
				.select(
					`
						id
					`,
					{ count: "exact", head: true },
				)
				.eq("category_id", sharedCategory?.category_id)
				.eq("trash", false);

			return {
				category_id: sharedCategory?.category_id as number,
				count: sharedBookmarkCountData ?? (0 as number),
			};
		},
	);

	const [userCategoryResults, sharedCategoryResults] = await Promise.all([
		Promise.all(buildCategoryPromises ?? []),
		Promise.all(sharedCategoryPromises ?? []),
	]);

	// Combine the results into the count object
	count = {
		...count,
		categoryCount: [
			...count.categoryCount,
			...userCategoryResults,
			...sharedCategoryResults,
		],
	};

	const errorMessages = [
		bookError?.message,
		bookTrashError?.message,
		bookUnCatError?.message,
		categoryError?.message,
		bookImageError?.message,
		bookVideoError?.message,
		sharedCategoryError?.message,
		bookmakrsLinksError?.message,
	];

	const nonEmptyErrors = errorMessages.filter((message) => !isEmpty(message));

	const errorText = nonEmptyErrors as unknown[];
	// Check for errors and update errorText array

	response.status(200).json({ data: count, error: errorText });
}
