import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestError,
	type PostgrestResponse,
} from "@supabase/supabase-js";
import { find, isEmpty } from "lodash";

import {
	type CategoriesData,
	type CollabDataInCategory,
	type FetchSharedCategoriesData,
	type NextApiRequest,
} from "../../../types/apiTypes";
import {
	CATEGORIES_TABLE_NAME,
	PROFILES,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

/**
 * Fetches user categories and builds it so that we get all its colaborators data
 */

type Data = {
	data: CategoriesData[] | null;
	error: PostgrestError | string | { message: string } | null;
};

export default async function handler(
	request: NextApiRequest<{}>,
	response: NextApiResponse<Data>,
) {
	try {
		const supabase = apiSupabaseClient(request, response);

		if (!supabase) {
			const errorMessage = "Failed to initialize Supabase client";
			console.error(`[fetch-user-categories] ${errorMessage}`);
			Sentry.captureException(
				new Error(`[fetch-user-categories] ${errorMessage}`),
			);
			response.status(500).json({
				data: null,
				error: { message: errorMessage },
			});
			return;
		}

		// Get authenticated user
		const userData = await supabase?.auth?.getUser();

		if (userData?.error) {
			console.error(
				"[fetch-user-categories][auth] Authentication failed:",
				userData.error,
			);
			Sentry.captureException(userData.error);
			response.status(401).json({
				data: null,
				error: { message: "Authentication failed" },
			});
			return;
		}

		const userId = userData?.data?.user?.id;
		const userEmail = userData?.data?.user?.email;

		if (!userId || !userEmail) {
			const errorMessage = "User ID or email not found";
			console.error(
				`[fetch-user-categories][user-validation] ${errorMessage}`,
				{
					hasUserId: Boolean(userId),
					hasEmail: Boolean(userEmail),
				},
			);
			Sentry.captureException(
				new Error(`[fetch-user-categories][user-validation] ${errorMessage}`),
			);
			response.status(401).json({
				data: null,
				error: { message: "Invalid user session" },
			});
			return;
		}

		// Fetch user's own categories (no profile join) and user profile in parallel
		const [categoriesResult, profileResult] = await Promise.all([
			supabase.from(CATEGORIES_TABLE_NAME).select("*").eq("user_id", userId),
			supabase
				.from(PROFILES)
				.select("profile_pic, user_name")
				.eq("id", userId)
				.single(),
		]);

		const { data, error } = categoriesResult;
		const { data: userProfile, error: profileError } = profileResult;

		if (profileError) {
			console.warn(
				"[fetch-user-categories][fetch-profile] Failed to fetch user profile:",
				{ error: profileError, userId },
			);
			Sentry.captureException(profileError, {
				tags: { operation: "fetch_user_profile", userId },
				extra: { userId },
			});
		}

		if (error) {
			console.error(
				"[fetch-user-categories][fetch-categories] Failed to fetch categories:",
				{
					error,
					userId,
				},
			);
			Sentry.captureException(error);
			response.status(500).json({
				data: null,
				error: { message: `Failed to fetch categories: ${error.message}` },
			});
			return;
		}

		// Get shared category data
		const {
			data: sharedCategoryData,
			error: sharedCategoryError,
		}: PostgrestResponse<FetchSharedCategoriesData> = await supabase.from(
			SHARED_CATEGORIES_TABLE_NAME,
		).select(`
      *,
      user_id (id, profile_pic),
      email
    `);

		if (sharedCategoryError) {
			// Don't return error here as shared categories are not critical
			console.error(
				"[fetch-user-categories][fetch-shared-categories] Failed to fetch shared categories:",
				sharedCategoryError,
			);
			Sentry.captureException(sharedCategoryError);
		}

		// Fetch categories where user is a collaborator
		const { data: userCollabCategoryData, error: userCollabError } =
			await supabase
				.from(SHARED_CATEGORIES_TABLE_NAME)
				.select(
					`category_id!inner(*, user_id(id, email, profile_pic, user_name))`,
				)
				.eq("email", userEmail)
				.eq("is_accept_pending", false);

		if (userCollabError) {
			console.error(
				"[fetch-user-categories][fetch-collab-categories] Failed to fetch collaborative categories:",
				{
					error: userCollabError,
					userEmail,
				},
			);
			Sentry.captureException(userCollabError);
			response.status(500).json({
				data: null,
				error: {
					message: `Failed to fetch collaborative categories: ${userCollabError.message}`,
				},
			});
			return;
		}

		// Attach authenticated user's profile to own categories (avoids profile join)
		const userCategories =
			data?.map((item) => ({
				...item,
				user_id: {
					id: userId,
					email: userEmail,
					profile_pic: userProfile?.profile_pic ?? "",
					user_name: userProfile?.user_name ?? "",
				},
			})) || [];
		const flattenedUserCollabCategoryData =
			userCollabCategoryData?.map((item) => item.category_id) || [];

		const userCategoriesDataWithCollabCategoriesData = [
			...userCategories,
			...(flattenedUserCollabCategoryData as unknown as CategoriesData[]),
		];

		// add colaborators data in each category
		const finalDataWithCollab = userCategoriesDataWithCollabCategoriesData?.map(
			(item) => {
				let collabData = [] as CollabDataInCategory[];
				if (sharedCategoryData) {
					for (const catItem of sharedCategoryData) {
						if (catItem?.category_id === item?.id) {
							collabData = [
								...collabData,
								{
									userEmail: catItem?.email,
									edit_access: catItem?.edit_access,
									share_id: catItem?.id,
									isOwner: false,
									is_accept_pending: catItem?.is_accept_pending,
									profile_pic: null,
								},
							];
						}
					}
				}

				const collabDataWithOwnerData = [
					...collabData,
					{
						userEmail: item?.user_id?.email,
						edit_access: true,
						share_id: null,
						isOwner: true,
						is_accept_pending: false,
						profile_pic: item?.user_id?.profile_pic,
					},
				];

				return {
					...item,
					collabData: collabDataWithOwnerData,
				};
			},
		);

		// TODO : figure out how to do this in supabase , and change this to next api
		const finalPublicFilteredData = finalDataWithCollab?.filter((item) => {
			const userCollabData = find(
				item?.collabData,
				(collabItem) => collabItem?.userEmail === userEmail,
			);
			// if logged-in user is a collaborator for this category, then return the category
			if (!isEmpty(userCollabData) && userCollabData?.isOwner === false) {
				return item;
			}

			// only return public categories that is created by logged in user
			if (!(item?.is_public === true && item?.user_id?.id !== userId)) {
				return item;
			}

			return null;
		}) as CategoriesData[];

		// Return successful response with filtered data
		response.status(200).json({
			data: finalPublicFilteredData,
			error: null,
		});
	} catch (error) {
		console.error(
			"[fetch-user-categories][unexpected-error] Internal server error:",
			{
				error,
				errorType: typeof error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
		);
		Sentry.captureException(error);
		response.status(500).json({
			data: null,
			error: { message: "Internal server error" },
		});
	}
}
