import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";

import { type SingleListData } from "../../../types/apiTypes";
import {
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	GET_SITE_SCOPE_PATTERN,
	GET_TEXT_WITH_AT_CHAR,
	imageFileTypes,
	IMAGES_URL,
	LINKS_URL,
	PAGINATION_LIMIT,
	TRASH_URL,
	TWEETS_URL,
	tweetType,
	UNCATEGORIZED_URL,
	videoFileTypes,
	VIDEOS_URL,
} from "../../../utils/constants";
import { isUserInACategoryInApi } from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// searches bookmarks

// TODO: current logic not efficient, rethink this logic

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		const { category_id, is_shared_category } = request.query;
		const search = request.query.search as string;

		const offset = Number.parseInt(request.query.offset as string, 10) || 0;
		const limit = PAGINATION_LIMIT;

		console.log("[search-bookmarks] API called:", {
			category_id,
			is_shared_category,
			rawSearch: search,
			offset,
			limit,
		});

		// Extract site scope (e.g., @instagram) from search query
		const matchedSiteScope = search?.match(GET_SITE_SCOPE_PATTERN);

		const urlScope =
			matchedSiteScope?.[0]?.replace("@", "")?.toLowerCase() ?? "";

		// Remove both #tags and @site from search text
		const searchText = search
			?.replace(GET_SITE_SCOPE_PATTERN, "")
			?.replace(GET_TEXT_WITH_AT_CHAR, "")
			?.trim();

		const matchedSearchTag = search?.match(GET_TEXT_WITH_AT_CHAR);

		const tagName =
			!isEmpty(matchedSearchTag) && !isNull(matchedSearchTag)
				? matchedSearchTag?.map((item) => item?.replace("#", ""))
				: undefined;

		console.log("[search-bookmarks] Parsed search parameters:", {
			urlScope,
			searchText,
			tagName,
		});

		const user_id = (await supabase?.auth?.getUser())?.data?.user?.id as string;

		if (!user_id) {
			console.warn("[search-bookmarks] Missing user_id from Supabase auth");
			response.status(401).json({
				data: null,
				error: { message: "Unauthorized" },
			});
			return;
		}

		let query = supabase
			.rpc("search_bookmarks_url_tag_scope", {
				search_text: searchText,
				url_scope: urlScope,
				tag_scope: tagName,
			})
			.eq("trash", category_id === TRASH_URL)
			.range(offset, offset + limit);

		// TODO: is_shared_category needs to be got in api itself not in payload
		if (is_shared_category === "false") {
			// if the collection is a shared one then is_shared_category will be true
			// if it is not a shared collection then add user_is to the filter query, as we need to bookmarks that have the uploaded by the user alone
			// if its is a shared collection then we need all the bookmarks in the collection irrespective of the user ,
			// because many people belongling to the collection would have uploaded their bookmarks
			query = query.eq("user_id", user_id);
		}

		const userInCollectionsCondition = isUserInACategoryInApi(
			category_id as string,
			false,
		);

		if (userInCollectionsCondition) {
			query = query.eq(
				"category_id",
				category_id === UNCATEGORIZED_URL ? 0 : category_id,
			);
		}

		if (category_id === IMAGES_URL) {
			query = query.in("type", imageFileTypes);
		}

		if (category_id === VIDEOS_URL) {
			query = query.in("type", videoFileTypes);
		}

		if (category_id === DOCUMENTS_URL) {
			query = query.in("type", documentFileTypes);
		}

		if (category_id === TWEETS_URL) {
			query = query.eq("type", tweetType);
		}

		if (category_id === LINKS_URL) {
			query = query.eq("type", bookmarkType);
		}

		const { data, error } = (await query) as unknown as {
			data: DataResponse;
			error: ErrorResponse;
		};

		if (error) {
			console.error("[search-bookmarks] Error executing search query:", {
				error,
				category_id,
				is_shared_category,
				rawSearch: search,
				urlScope,
				tagName,
			});
			Sentry.captureException(error, {
				tags: {
					operation: "search_bookmarks",
					userId: user_id,
				},
				extra: { category_id, is_shared_category, rawSearch: search },
			});
			response.status(500).json({
				data: null,
				error: { message: "Error executing search query:" },
			});
			return;
		}

		if (!data || isEmpty(data)) {
			console.warn(
				"No data returned from the database while searching bookmarks:",
				{ data, searchText, tagName, urlScope },
			);
		}

		console.log("[search-bookmarks] Search query succeeded:", {
			resultsCount: data?.length ?? 0,
			category_id,
			is_shared_category,
			hasTagFilter: !isEmpty(tagName),
		});

		const finalData = data?.map((item) => {
			// Rename ogimage -> ogImage
			const { ogimage, ...rest } = item;
			return { ...rest, ogImage: ogimage };
		}) as SingleListData[];

		response.status(200).json({ data: finalData, error: null });
	} catch (error) {
		console.error("Unexpected error in search-bookmarks:", error);
		Sentry.captureException(error, {
			tags: {
				operation: "search-bookmarks_unexpected",
			},
		});
		response.status(500).json({
			data: null,
			error: { message: "An unexpected error occurred" },
		});
	}
}
