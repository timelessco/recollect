/* eslint-disable complexity */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import {
	type AuthError,
	type PostgrestError,
	type User,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNil } from "lodash";
import isNull from "lodash/isNull";

import {
	BOOKMAKRS_STORAGE_NAME,
	BOOKMARK_TAGS_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	FILES_STORAGE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
	SHARED_CATEGORIES_TABLE_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
	STORAGE_SCREENSHOT_IMAGES_PATH,
	TAG_TABLE_NAME,
	USER_PROFILE_STORAGE_NAME,
} from "../../../utils/constants";
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

// deletes user

type DataResponse = { user: User | null } | null;
type ErrorResponse = AuthError | PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const { error: _error } = verifyAuthToken(
		request.body.access_token as string,
	);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const supabase = apiSupabaseClient();

	const userId = request?.body?.id;
	const email = request?.body?.email;

	// bookmark_tags delete
	const { error: bookmarkTagsError } = await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(bookmarkTagsError)) {
		response.status(500).json({ data: null, error: bookmarkTagsError });
		throw new Error("ERROR: bookmarkTagsError");
	} else {
		log("deleted bookmark_tags table data", userId);
	}
	// bookmarks_table delete

	const { error: bookmarksTableError } = await supabase
		.from(MAIN_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(bookmarksTableError)) {
		response.status(500).json({ data: null, error: bookmarksTableError });
		throw new Error("ERROR: bookmarksTableError");
	} else {
		log("deleted bookmarks table data", userId);
	}
	// tags delete

	const { error: tagsError } = await supabase
		.from(TAG_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(tagsError)) {
		response.status(500).json({ data: null, error: tagsError });
		throw new Error("ERROR: tagsError");
	} else {
		log("deleted tags table data", userId);
	}
	// shared_categories delete (user delete , deletes all categories that the user has created)

	const { error: sharedCategoriesError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(sharedCategoriesError)) {
		response.status(500).json({ data: null, error: sharedCategoriesError });
		throw new Error("ERROR: sharedCategoriesError");
	} else {
		log("deleted shared categories table data", userId, "and emails ", email);
	}

	// shared_categories delete (email delete , deletes all categories connections user is part of)

	const { error: sharedCategoriesEmailError } = await supabase
		.from(SHARED_CATEGORIES_TABLE_NAME)
		.delete()
		.eq("email", email);

	if (!isNull(sharedCategoriesEmailError)) {
		response
			.status(500)
			.json({ data: null, error: sharedCategoriesEmailError });
		throw new Error("ERROR: sharedCategoriesEmailError");
	} else {
		log(
			"deleted shared categories email table data",
			userId,
			"and emails ",
			email,
		);
	}
	// categories delete

	// the collab categories created by the user might have bookmarks added by other user that are collaborators
	// these bookmakrs added by other users need to be set as uncategorised (id : 0)
	// get all category ids for the user
	const { data: categoriesData, error: categoriesDataError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select(`id`)
		.eq("user_id", userId);

	if (!isNull(categoriesDataError)) {
		response.status(500).json({ data: null, error: categoriesDataError });
		throw new Error("ERROR: categoriesDataError");
	}

	// set category id to uncategorised (id: 0)

	if (!isNil(categoriesData) && !isEmpty(categoriesData)) {
		const { data: updateData, error: updateError } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({ category_id: 0 })
			.in(
				"category_id",
				categoriesData?.map((item) => item?.id),
			)
			.select(`id`);

		if (!isNull(updateError)) {
			response.status(500).json({ data: null, error: updateError });
			throw new Error("ERROR: updateError");
		} else {
			log(
				"updated collab bookmarks to uncategoried",
				updateData?.map((item) => item?.id),
			);
		}
	}

	// delete all the categories for the user
	const { error: categoriesError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.delete()
		.eq("user_id", userId);

	if (!isNull(categoriesError)) {
		response.status(500).json({ data: null, error: categoriesError });
		throw new Error("ERROR: categoriesError");
	} else {
		log("deleted categories table data", userId);
	}

	// profile delete
	const { error: profileError } = await supabase
		.from(PROFILES)
		.delete()
		.eq("id", userId);

	if (!isNull(profileError)) {
		response.status(500).json({ data: null, error: profileError });
		throw new Error("ERROR: profileError");
	} else {
		log("deleted profiles table data", userId);
	}

	// bookmarks storage ogImages delete

	const { data: bookmarksStorageFiles, error: bookmarksStorageError } =
		await supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.list(`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}`);
	const filesToRemove = bookmarksStorageFiles?.map(
		(x) => `${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${x.name}`,
	);

	if (!isNull(bookmarksStorageError)) {
		response
			.status(500)
			.json({ data: null, error: bookmarksStorageError as unknown as string });
		throw new Error("ERROR: bookmarksStorageError");
	}

	if (!isEmpty(filesToRemove) && !isNil(filesToRemove)) {
		const {
			data: bookmarksStorageDeleteData,
			error: bookmarksStorageDeleteError,
		} = await supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.remove(filesToRemove);

		if (!isNull(bookmarksStorageDeleteError)) {
			response.status(500).json({
				data: null,
				error: bookmarksStorageDeleteError as unknown as string,
			});
			throw new Error("ERROR: bookmarksStorageDeleteError");
		} else {
			log("deleted og images", bookmarksStorageDeleteData?.length);
		}
	} else {
		log("files to delete is empty: ogImages");
	}

	// bookmarks storage screenshot delete

	const {
		data: bookmarksStorageScreenshotFiles,
		error: bookmarksStorageScreenshotError,
	} = await supabase.storage
		.from(BOOKMAKRS_STORAGE_NAME)
		.list(`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}`);
	const filesToRemoveScreenshot = bookmarksStorageScreenshotFiles?.map(
		(x) => `${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${x.name}`,
	);

	if (!isNull(bookmarksStorageScreenshotError)) {
		response.status(500).json({
			data: null,
			error: bookmarksStorageScreenshotError as unknown as string,
		});
		throw new Error("ERROR: bookmarksStorageScreenshotError");
	}

	if (!isEmpty(filesToRemoveScreenshot) && !isNil(filesToRemoveScreenshot)) {
		const {
			data: bookmarksStorageScreenshotDeleteData,
			error: bookmarksStorageScreenshotDeleteError,
		} = await supabase.storage
			.from(BOOKMAKRS_STORAGE_NAME)
			.remove(filesToRemoveScreenshot);

		if (!isNull(bookmarksStorageScreenshotDeleteError)) {
			response.status(500).json({
				data: null,
				error: bookmarksStorageScreenshotDeleteError as unknown as string,
			});
			throw new Error("ERROR: bookmarksStorageScreenshotDeleteError");
		} else {
			log(
				"deleted screenshot images",
				bookmarksStorageScreenshotDeleteData?.length,
			);
		}
	} else {
		log("files to delete is empty: screenshot");
	}

	// files storage delete

	const { data: filesStorageData, error: filesStorageDataError } =
		await supabase.storage.from(FILES_STORAGE_NAME).list(`public/${userId}`);
	const filesStorageFilesToRemove = filesStorageData?.map(
		(x) => `public/${userId}/${x.name}`,
	);

	if (!isNull(filesStorageDataError)) {
		response
			.status(500)
			.json({ data: null, error: filesStorageDataError as unknown as string });
		throw new Error("ERROR: filesStorageDataError");
	}

	if (
		!isEmpty(filesStorageFilesToRemove) &&
		!isNil(filesStorageFilesToRemove)
	) {
		const { data: filesDeleteData, error: filesDeleteError } =
			await supabase.storage
				.from(FILES_STORAGE_NAME)
				.remove(filesStorageFilesToRemove);

		if (!isNull(filesDeleteError)) {
			response
				.status(500)
				.json({ data: null, error: filesDeleteError as unknown as string });
			throw new Error("ERROR: filesDeleteError");
		} else {
			log("deleted files", filesDeleteData?.length);
		}
	} else {
		log("files to delete is empty : files");
	}

	// user profile storage delete

	const { data: userProfileFilesData, error: userProfileFilesError } =
		await supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.list(`public/${userId}`);
	const userProfileFilesToRemove = userProfileFilesData?.map(
		(x) => `public/${userId}/${x.name}`,
	);

	if (!isNull(userProfileFilesError)) {
		response
			.status(500)
			.json({ data: null, error: userProfileFilesError as unknown as string });
		throw new Error("ERROR: userProfileFilesError");
	}

	if (!isEmpty(userProfileFilesToRemove) && !isNil(userProfileFilesToRemove)) {
		const {
			data: userProfileFilesDeleteData,
			error: userProfileFilesDeleteError,
		} = await supabase.storage
			.from(USER_PROFILE_STORAGE_NAME)
			.remove(userProfileFilesToRemove);

		if (!isNull(userProfileFilesDeleteError)) {
			response.status(500).json({
				data: null,
				error: userProfileFilesDeleteError as unknown as string,
			});
			throw new Error("ERROR: userProfileFilesDeleteError");
		} else {
			log("deleted user profile files", userProfileFilesDeleteData?.length);
		}
	} else {
		log("files to delete is empty : user profiles");
	}

	// deleting user in main auth table

	const { data, error } = await supabase.auth.admin.deleteUser(userId);

	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR: del user auth table");
	}

	response.status(200).json({ data, error: null });
}
