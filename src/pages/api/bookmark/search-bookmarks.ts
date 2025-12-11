import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import { z } from "zod";

import { type SingleListData } from "../../../types/apiTypes";
import {
	bookmarkType,
	documentFileTypes,
	DOCUMENTS_URL,
	GET_HASHTAG_TAG_PATTERN,
	GET_SITE_SCOPE_PATTERN,
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
import {
	checkIsUserOwnerOfCategory,
	extractTagNamesFromSearch,
	isUserCollaboratorInCategory,
	isUserInACategoryInApi,
} from "../../../utils/helpers";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

const querySchema = z.object({
	search: z.string().min(1, "Search parameter is required"),
	category_id: z.string().optional(),
});

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	try {
		const parseResult = querySchema.safeParse(request.query);

		if (!parseResult.success) {
			console.warn("[search-bookmarks] Invalid search parameter:", {
				issues: parseResult.error.issues,
			});
			response.status(400).json({
				data: null,
				error: { message: "Search parameter is required" },
			});
			return;
		}

		const supabase = apiSupabaseClient(request, response);

		const { data: userData, error: userError } = await supabase.auth.getUser();
		const user_id = userData?.user?.id;
		const email = userData?.user?.email as string;

		if (userError || !user_id) {
			console.warn("[search-bookmarks] Missing user_id from Supabase auth");
			response.status(401).json({
				data: null,
				error: { message: "Unauthorized" },
			});
			return;
		}

		const { search, category_id } = parseResult.data;

		const offset = Number.parseInt(request.query.offset as string, 10) || 0;
		const limit = PAGINATION_LIMIT;

		console.log("[search-bookmarks] API called:", {
			category_id,
			rawSearch: search,
			offset,
			limit,
		});

		const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
		const urlScope =
			matchedSiteScope?.[0]?.replace("@", "")?.toLowerCase() ?? "";

		const searchText = search
			?.replace(GET_SITE_SCOPE_PATTERN, "")
			?.replace(GET_HASHTAG_TAG_PATTERN, "")
			?.trim();

		const tagName = extractTagNamesFromSearch(search);

		console.log("[search-bookmarks] Parsed search parameters:", {
			urlScope,
			searchText,
			tagName,
		});

		let query = supabase
			.rpc("search_bookmarks_url_tag_scope", {
				search_text: searchText,
				url_scope: urlScope,
				tag_scope: tagName,
			})
			.eq("trash", category_id === TRASH_URL)
			.range(offset, offset + limit);

		const userInCollectionsCondition = isUserInACategoryInApi(
			category_id as string,
			false,
		);

		if (!userInCollectionsCondition) {
			// if user is not in any category, then get only the items that match the user_id
			query = query.eq("user_id", user_id);
		}

		if (userInCollectionsCondition) {
			// check if user is a collaborator for the category
			const {
				success: isUserCollaboratorInCategorySuccess,
				isCollaborator: isUserCollaboratorInCategoryValue,
				error: isUserCollaboratorInCategoryError,
			} = await isUserCollaboratorInCategory(
				supabase,
				category_id as string,
				email,
			);

			if (!isUserCollaboratorInCategorySuccess) {
				console.error(
					"[search-bookmarks] Error checking if user is a collaborator for the category:",
					isUserCollaboratorInCategoryError,
				);
				Sentry.captureException(isUserCollaboratorInCategoryError, {
					tags: {
						operation: "check_user_collaborator_of_category",
					},
					extra: { category_id },
					user: {
						id: user_id,
						email,
					},
				});
				response.status(500).json({
					data: null,
					error: {
						message:
							"Error checking if user is a collaborator for the category",
					},
				});
				return;
			}

			// check if user is the owner of the category
			const {
				success: isUserOwnerOfCategorySuccess,
				isOwner: isUserOwnerOfCategory,
				error: isUserOwnerOfCategoryError,
			} = await checkIsUserOwnerOfCategory(
				supabase,
				category_id as string,
				user_id,
			);

			if (!isUserOwnerOfCategorySuccess) {
				console.error(
					"[search-bookmarks] Error checking if user is the owner of the category:",
					isUserOwnerOfCategoryError,
				);
				Sentry.captureException(isUserOwnerOfCategoryError, {
					tags: {
						operation: "check_user_owner_of_category",
					},
					extra: { category_id },
					user: {
						id: user_id,
						email,
					},
				});
				response.status(500).json({
					data: null,
					error: {
						message: "Error checking if user is the owner of the category",
					},
				});
				return;
			}

			// check if user is not a collaborator or the owner of the category
			const is_user_not_collaborator_or_owner =
				!isUserCollaboratorInCategoryValue && !isUserOwnerOfCategory;

			if (is_user_not_collaborator_or_owner) {
				// if user is not a collaborator or the owner of the category, then get only the items that match the user_id and category_id
				query = query.eq("user_id", user_id);
			}

			// get all the items for the category_id irrespective of the user_id, as user has access to all the items in the category
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
				rawSearch: search,
				urlScope,
				tagName,
			});
			Sentry.captureException(error, {
				tags: {
					operation: "search_bookmarks",
					userId: user_id,
				},
				extra: { category_id, rawSearch: search },
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
			hasTagFilter: !isEmpty(tagName),
		});

		const finalData = (data ?? []).map((item) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { ogimage, added_tags: addedTags, ...rest } = item as any;

			return {
				...(rest as SingleListData),
				ogImage: ogimage,
				addedTags,
			};
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
