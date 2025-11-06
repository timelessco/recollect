// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { log } from "console";
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import {
	type AuthError,
	type PostgrestError,
	type SupabaseClient,
	type User,
} from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty, isNil } from "lodash";
import isNull from "lodash/isNull";

import { deleteEmbeddings } from "../../../async/supabaseCrudHelpers/ai/embeddings";
import { type SingleListData } from "../../../types/apiTypes";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
	R2_MAIN_BUCKET_NAME,
	SHARED_CATEGORIES_TABLE_NAME,
	STORAGE_FILES_PATH,
	STORAGE_SCRAPPED_IMAGES_PATH,
	STORAGE_SCREENSHOT_IMAGES_PATH,
	STORAGE_USER_PROFILE_PATH,
	TAG_TABLE_NAME,
} from "../../../utils/constants";
import { r2Helpers } from "../../../utils/r2Client";
import { createServiceClient } from "../../../utils/supabaseClient";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this api deletes user

type DataResponse = { user: User | null } | null;
type ErrorResponse = AuthError | PostgrestError | VerifyErrors | string | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

// deletes category data
const categoriesDelete = async (
	userId: SingleListData["user_id"]["id"],
	response: NextApiResponse<Data>,
	supabase: SupabaseClient,
) => {
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
};

// all deletes related to s3 storage
const storageDeleteLogic = async (
	userId: SingleListData["user_id"]["id"],
	response: NextApiResponse<Data>,
) => {
	// bookmarks storage ogImages delete

	const { data: bookmarksStorageFiles, error: bookmarksStorageError } =
		await r2Helpers.listObjects(
			R2_MAIN_BUCKET_NAME,
			`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/`,
		);

	const filesToRemove = bookmarksStorageFiles?.map((x) => x?.Key ?? "");

	if (!isNull(bookmarksStorageError)) {
		response
			.status(500)
			.json({ data: null, error: String(bookmarksStorageError) });
		throw new Error("ERROR: bookmarksStorageError");
	}

	if (!isEmpty(filesToRemove) && !isNil(filesToRemove)) {
		const { error: bookmarksStorageDeleteError } =
			await r2Helpers.deleteObjects(R2_MAIN_BUCKET_NAME, filesToRemove);

		if (!isNull(bookmarksStorageDeleteError)) {
			response.status(500).json({
				data: null,
				error: String(bookmarksStorageDeleteError),
			});
			throw new Error("ERROR: bookmarksStorageDeleteError");
		} else {
			log("deleted og images", filesToRemove?.length);
		}
	} else {
		log("files to delete is empty: ogImages");
	}

	// bookmarks storage screenshot delete

	const {
		data: bookmarksStorageScreenshotFiles,
		error: bookmarksStorageScreenshotError,
	} = await r2Helpers.listObjects(
		R2_MAIN_BUCKET_NAME,
		`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/`,
	);

	const filesToRemoveScreenshot = bookmarksStorageScreenshotFiles?.map(
		(x) => x?.Key ?? "",
	);

	if (!isNull(bookmarksStorageScreenshotError)) {
		response.status(500).json({
			data: null,
			error: String(bookmarksStorageScreenshotError),
		});
		throw new Error("ERROR: bookmarksStorageScreenshotError");
	}

	if (!isEmpty(filesToRemoveScreenshot) && !isNil(filesToRemoveScreenshot)) {
		const { error: bookmarksStorageScreenshotDeleteError } =
			await r2Helpers.deleteObjects(
				R2_MAIN_BUCKET_NAME,
				filesToRemoveScreenshot,
			);

		if (!isNull(bookmarksStorageScreenshotDeleteError)) {
			response.status(500).json({
				data: null,
				error: String(bookmarksStorageScreenshotDeleteError),
			});
			throw new Error("ERROR: bookmarksStorageScreenshotDeleteError");
		} else {
			log("deleted screenshot images", filesToRemoveScreenshot?.length);
		}
	} else {
		log("files to delete is empty: screenshot");
	}

	// files storage delete

	const { data: filesStorageData, error: filesStorageDataError } =
		await r2Helpers.listObjects(
			R2_MAIN_BUCKET_NAME,
			`${STORAGE_FILES_PATH}/${userId}/`,
		);

	const filesStorageFilesToRemove = filesStorageData?.map((x) => x?.Key ?? "");

	if (!isNull(filesStorageDataError)) {
		response
			.status(500)
			.json({ data: null, error: String(filesStorageDataError) });
		throw new Error("ERROR: filesStorageDataError");
	}

	if (
		!isEmpty(filesStorageFilesToRemove) &&
		!isNil(filesStorageFilesToRemove)
	) {
		const { error: filesDeleteError } = await r2Helpers.deleteObjects(
			R2_MAIN_BUCKET_NAME,
			filesStorageFilesToRemove,
		);

		if (!isNull(filesDeleteError)) {
			response
				.status(500)
				.json({ data: null, error: String(filesDeleteError) });
			throw new Error("ERROR: filesDeleteError");
		} else {
			log("deleted files", filesStorageFilesToRemove?.length);
		}
	} else {
		log("files to delete is empty : files");
	}

	// user profile storage delete

	const { data: userProfileFilesData, error: userProfileFilesError } =
		await r2Helpers.listObjects(
			R2_MAIN_BUCKET_NAME,
			`${STORAGE_USER_PROFILE_PATH}/${userId}/`,
		);

	const userProfileFilesToRemove = userProfileFilesData?.map(
		(x) => x?.Key ?? "",
	);

	if (!isNull(userProfileFilesError)) {
		response
			.status(500)
			.json({ data: null, error: String(userProfileFilesError) });
		throw new Error("ERROR: userProfileFilesError");
	}

	if (!isEmpty(userProfileFilesToRemove) && !isNil(userProfileFilesToRemove)) {
		const { error: userProfileFilesDeleteError } =
			await r2Helpers.deleteObjects(
				R2_MAIN_BUCKET_NAME,
				userProfileFilesToRemove,
			);

		if (!isNull(userProfileFilesDeleteError)) {
			response.status(500).json({
				data: null,
				error: String(userProfileFilesDeleteError),
			});
			throw new Error("ERROR: userProfileFilesDeleteError");
		} else {
			log("deleted user profile files", userProfileFilesToRemove?.length);
		}
	} else {
		log("files to delete is empty : user profiles");
	}
};

const deleteUserEmbeddings = async (request: NextApiRequest) => {
	try {
		await deleteEmbeddings([], request, true);
		log("deleted user embeddings");
	} catch {
		Sentry.captureException(`Delete user embeddings error`);
	}
};

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const userData = await supabase?.auth?.getUser();

	const userId = userData?.data?.user?.id as string;
	const email = userData?.data?.user?.email as string;

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

	await categoriesDelete(userId, response, supabase);

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

	// all bookmarks s3 storage deletes
	await storageDeleteLogic(userId, response);

	// deleting all user embeddings

	await deleteUserEmbeddings(request);

	// deleting user in main auth table
	const serviceSupabase = createServiceClient();

	const { data, error } = await serviceSupabase.auth.admin.deleteUser(userId);

	if (!isNull(error)) {
		response.status(500).json({ data: null, error });
		throw new Error("ERROR: del user auth table");
	}

	response.status(200).json({ data, error: null });
}
