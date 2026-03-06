import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import isEmpty from "lodash/isEmpty";
import { z } from "zod";

import { type SingleListData } from "../../../types/apiTypes";
import {
	AUDIO_URL,
	audioFileTypes,
	bookmarkType,
	DISCOVER_URL,
	documentFileTypes,
	DOCUMENTS_URL,
	GET_HASHTAG_TAG_PATTERN,
	GET_SITE_SCOPE_PATTERN,
	imageFileTypes,
	IMAGES_URL,
	INSTAGRAM_URL,
	instagramType,
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

		const { search, category_id } = parseResult.data;

		const isDiscoverPage = category_id === DISCOVER_URL;

		// Discover page doesn't require authentication
		let user_id: string | undefined;
		let email: string | undefined;

		if (!isDiscoverPage) {
			const { data: userData, error: userError } =
				await supabase.auth.getUser();
			user_id = userData?.user?.id;
			email = userData?.user?.email as string;

			if (userError || !user_id) {
				console.warn("[search-bookmarks] Missing user_id from Supabase auth");
				response.status(401).json({
					data: null,
					error: { message: "Unauthorized" },
				});
				return;
			}
		}

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

		// Determine category_scope for junction table filtering
		// Only set for numeric category IDs, not special URLs (IMAGES_URL, VIDEOS_URL, etc.)
		const userInCollections = isUserInACategoryInApi(
			category_id as string,
			false,
		);
		const categoryScope = userInCollections
			? category_id === UNCATEGORIZED_URL
				? 0
				: Number(category_id)
			: null;

		console.log("[search-bookmarks] Parsed search parameters:", {
			urlScope,
			searchText,
			tagName,
			categoryScope,
		});

		const isTrashPage = category_id === TRASH_URL;
		let query = supabase
			.rpc("search_bookmarks_url_tag_scope", {
				search_text: searchText,
				url_scope: urlScope,
				tag_scope: tagName,
				category_scope: isDiscoverPage ? null : categoryScope,
			})
			.range(offset, offset + limit - 1);

		// Filter by trash status: trash IS NULL for non-trash, trash IS NOT NULL for trash page
		if (isTrashPage) {
			query = query.not("trash", "is", null);
		} else {
			query = query.is("trash", null);
		}

		if (isDiscoverPage) {
			query = query.not("make_discoverable", "is", null);
		} else {
			const userId = user_id as string;
			const userEmail = email as string;

			if (!userInCollections) {
				query = query.eq("user_id", userId);
			}

			if (userInCollections) {
				// check if user is a collaborator for the category
				const {
					success: isUserCollaboratorInCategorySuccess,
					isCollaborator: isUserCollaboratorInCategoryValue,
					error: isUserCollaboratorInCategoryError,
				} = await isUserCollaboratorInCategory(
					supabase,
					category_id as string,
					userEmail,
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
							id: userId,
							email: userEmail,
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
					userId,
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
							id: userId,
							email: userEmail,
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
					query = query.eq("user_id", userId);
				}
			}
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

		if (category_id === INSTAGRAM_URL) {
			query = query.eq("type", instagramType);
		}

		if (category_id === AUDIO_URL) {
			query = query.or(
				`type.in.(${audioFileTypes}),meta_data->>mediaType.in.(${audioFileTypes})`,
			);
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
					userId: user_id ?? "discover_page",
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
			const {
				ogimage,
				added_tags: addedTags,
				added_categories: addedCategories,
				...rest
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} = item as any;

			return {
				...(rest as SingleListData),
				ogImage: ogimage,
				addedTags,
				addedCategories,
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
