/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { type NextApiRequest, type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import { type BookmarksCountTypes } from "../../../types/apiTypes";
import {
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	imageFileTypes,
	MAIN_TABLE_NAME,
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

	const { error: _error, decoded } = verifyAuthToken(accessToken);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	} else {
		userId = decoded?.sub;
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
		allBookmarks: bookmarkCount || (0 as number),
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
		images: bookmarkImageCount || (0 as number),
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
		videos: bookmarkVideoCount || (0 as number),
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
		links: bookmakrsLinks || (0 as number),
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
		trash: bookmarkTrashCount || (0 as number),
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
		uncategorized: bookmarkUnCatCount || (0 as number),
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

	const buildCategoryCount = new Promise<void>((resolve) => {
		if (isNull(userCategoryIds) || isEmpty(userCategoryIds)) {
			resolve();
		}

		// eslint-disable-next-line unicorn/no-array-for-each, @typescript-eslint/no-misused-promises
		userCategoryIds?.forEach(async (item) => {
			const { count: bookmarkCountData } = await supabase
				.from(MAIN_TABLE_NAME)
				.select(
					`
          id
        `,
					{ count: "exact", head: true },
				)
				.eq("user_id", userId)
				.eq("category_id", item?.id)
				.eq("trash", false);

			count = {
				...count,
				categoryCount: [
					// eslint-disable-next-line no-unsafe-optional-chaining
					...count?.categoryCount,
					{
						category_id: item?.id as number,
						count: bookmarkCountData || (0 as number),
					},
				],
			};

			if (
				// index === userCategoryIds?.length - 1 &&
				// index === count?.categoryCount?.length - 1
				userCategoryIds?.length === count?.categoryCount?.length
			) {
				resolve();
			}
		});
	});

	await buildCategoryCount.then(() => {
		let errorText = [] as unknown[];

		if (
			!isEmpty(bookError?.message) ||
			!isEmpty(bookTrashError?.message) ||
			!isEmpty(bookUnCatError?.message) ||
			!isEmpty(categoryError?.message) ||
			!isEmpty(bookImageError?.message) ||
			!isEmpty(bookVideoError?.message) ||
			!isEmpty(bookmakrsLinksError?.message)
		) {
			errorText = [
				...errorText,
				bookError?.message ||
					bookTrashError?.message ||
					bookUnCatError?.message ||
					categoryError?.message ||
					bookImageError?.message ||
					bookVideoError?.message ||
					bookmakrsLinksError?.message ||
					bookError?.message,
			];
		}

		response.status(200).json({ data: count, error: errorText });
	});
}
