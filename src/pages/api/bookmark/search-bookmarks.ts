import { type NextApiRequest, type NextApiResponse } from "next";
import {
	createClient,
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import {
	type BookmarksWithTagsWithTagForginKeys,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	GET_TEXT_WITH_AT_CHAR,
	TRASH_URL,
	UNCATEGORIZED_URL,
} from "../../../utils/constants";

// searches bookmarks

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	verify(
		request.query.access_token as string,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ data: null, error: error_ });
				throw new Error("ERROR");
			}
		},
	);

	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	// disabling as this check is not needed here
	const { category_id } = request.query;
	const search = request.query.search as string;

	const searchText = search?.replace(GET_TEXT_WITH_AT_CHAR, "");

	const matchedSearchTag = search?.match(GET_TEXT_WITH_AT_CHAR);

	const tagName =
		!isEmpty(matchedSearchTag) && !isNull(matchedSearchTag)
			? matchedSearchTag?.map((item) => item?.replace("@", ""))
			: undefined;

	const tokenDecode: { sub: string } = jwtDecode(
		request.query.access_token as string,
	);

	// disabling as this check is not needed here
	const user_id = tokenDecode?.sub;

	let query = supabase
		.rpc("search_bookmarks", {
			search_text: searchText,
		})
		.eq("trash", category_id === TRASH_URL)

		.eq("user_id", request.query.user_id);

	if (
		!isNull(category_id) &&
		category_id !== "null" &&
		category_id !== TRASH_URL
	) {
		query = query.eq(
			"category_id",
			category_id === UNCATEGORIZED_URL ? 0 : category_id,
		);
	}

	const { data, error } = (await query) as unknown as {
		data: DataResponse;
		error: ErrorResponse;
	};

	if (!tagName) {
		// user has searched for text without tags

		const { data: bookmarksWithTags } = await supabase
			.from(BOOKMARK_TAGS_TABLE_NAME)
			.select(
				`
        bookmark_id,
        tag_id (
          id,
          name
        )
      `,
			)
			.eq("user_id", user_id);

		const finalData = data?.map((item) => {
			const matchedBookmarkWithTag = bookmarksWithTags?.filter(
				(tagItem) => tagItem?.bookmark_id === item?.id,
			) as BookmarksWithTagsWithTagForginKeys;

			if (!isEmpty(matchedBookmarkWithTag)) {
				return {
					...item,
					addedTags: matchedBookmarkWithTag?.map((matchedItem) => ({
						id: matchedItem?.tag_id?.id,
						name: matchedItem?.tag_id?.name,
					})),
				};
			}

			return item;
		}) as SingleListData[];

		response.status(200).json({ data: finalData, error });
	} else {
		const { data: bookmarksWithTags } = (await supabase
			.from(BOOKMARK_TAGS_TABLE_NAME)
			.select(
				`
      bookmark_id (*),
      tag_id!inner(
        id,
        name
      )
    `,
			)
			.eq("user_id", user_id)
			.in("tag_id.name", tagName)) as PostgrestResponse<{
			bookmark_id: SingleListData;
			tag_id: number;
		}>;

		if (isEmpty(data)) {
			// user as only searched for tags and no text

			const finalResponse: SingleListData[] = bookmarksWithTags?.map(
				(item) => ({
					...item?.bookmark_id,
					addedTags: [item?.tag_id],
				}),
			) as unknown as SingleListData[];

			response.status(200).json({
				data: finalResponse,
				error,
			});
		} else {
			// user searched for tag with text
			const finalData = data?.filter((item) => {
				const bookmarkTagId = find(
					bookmarksWithTags,
					(tagBookmark) => tagBookmark?.bookmark_id?.id === item?.id,
				);

				if (bookmarkTagId) {
					return item;
				}

				return null;
			});

			response.status(200).json({
				data: finalData?.map((item) => {
					const bookmarkTagId = find(
						bookmarksWithTags,
						(tagBookmark) => tagBookmark?.bookmark_id?.id === item?.id,
					);
					if (bookmarkTagId) {
						return {
							...item,
							addedTags: [bookmarkTagId?.tag_id],
						};
					}

					return null;
				}) as unknown as SingleListData[] | null,
				error,
			});
		}
	}
}
