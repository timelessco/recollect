import { type NextApiRequest, type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

// import { supabase } from '../../utils/supabaseClient';
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import {
	bookmarkType,
	CATEGORIES_TABLE_NAME,
	imageFileTypes,
	MAIN_TABLE_NAME,
	videoFileTypes,
} from "../../../utils/constants";

// get all bookmarks count

type Data = {
	data: BookmarksCountTypes | null;
	error: PostgrestError | VerifyErrors | string | null;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const accessToken = request.query.access_token as string;

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	// let decode: { sub: string };

	let userId: string | (() => string) | undefined;

	verify(accessToken, process.env.SUPABASE_JWT_SECRET_KEY, (error, decoded) => {
		if (error) {
			response.status(500).json({ data: null, error });
			throw new Error("ERROR");
		} else {
			// decode = decoded.s;
			userId = decoded?.sub;
		}
	});

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
		allBookmarks: bookmarkCount as number,
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
		images: bookmarkImageCount as number,
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
		videos: bookmarkVideoCount as number,
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
		links: bookmakrsLinks as number,
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
		trash: bookmarkTrashCount as number,
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
		uncategorized: bookmarkUnCatCount as number,
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
						count: bookmarkCountData as number,
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
		if (
			isNull(bookError) &&
			isNull(bookTrashError) &&
			isNull(bookUnCatError) &&
			isNull(categoryError) &&
			isNull(bookImageError) &&
			isNull(bookVideoError) &&
			isNull(bookmakrsLinksError)
		) {
			response.status(200).json({ data: count, error: null });
		} else {
			response.status(500).json({
				data: null,
				error: bookError ?? bookTrashError ?? bookUnCatError ?? categoryError,
			});
			throw new Error("ERROR");
		}
	});
}
