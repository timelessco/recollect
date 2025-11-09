// ! TODO: Fix this in priority
/* eslint-disable @typescript-eslint/no-base-to-string */
import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type DeleteBookmarkPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	MAIN_TABLE_NAME,
	R2_MAIN_BUCKET_NAME,
	STORAGE_FILES_PATH,
	STORAGE_SCRAPPED_IMAGES_PATH,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../utils/constants";
import { r2Helpers } from "../../../utils/r2Client";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this is a cascading delete, deletes bookmarks from main table and all its respective joint tables

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | string | null;
type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

export default async function handler(
	request: NextApiRequest<{
		data: DeleteBookmarkPayload;
	}>,
	response: NextApiResponse<Data>,
) {
	const supabase = apiSupabaseClient(request, response);

	const apiData = request.body.data;

	const userId = (await supabase?.auth?.getUser())?.data?.user?.id as string;

	// screenshots ogImages in bucket
	// Using Set to remove duplicates since ogImage and meta_data.screenshot might point to the same file
	const deleteScreenshotImagePaths = [
		...new Set(
			apiData?.deleteData?.flatMap((item) => {
				const paths = [];

				// Add ogImage path if it exists
				const ogImageLink = item?.ogImage;
				if (ogImageLink) {
					const imgName =
						ogImageLink?.split("/")?.[ogImageLink?.split("/")?.length - 1];
					if (imgName) {
						paths.push(
							`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${imgName}`,
						);
					}
				}

				// Add meta_data.screenshot path if it exists
				const screenshotLink = item?.meta_data?.screenshot;
				if (screenshotLink) {
					const screenshotName =
						screenshotLink?.split("/")?.[
							screenshotLink?.split("/")?.length - 1
						];
					if (screenshotName) {
						paths.push(
							`${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${screenshotName}`,
						);
					}
				}

				return paths;
			}) || [],
		),
	];

	const { error: storageScreenshotOgImageError } =
		await r2Helpers.deleteObjects(
			R2_MAIN_BUCKET_NAME,
			deleteScreenshotImagePaths,
		);

	// delete ogImages in bucket
	// Using Set to remove duplicates since ogImage and meta_data.coverImage might point to the same file
	const deleteImagePaths = [
		...new Set(
			apiData?.deleteData?.flatMap((item) => {
				const paths = [];

				// Add ogImage path if it exists
				const ogImageLink = item?.ogImage;
				if (ogImageLink) {
					const imgName =
						ogImageLink?.split("/")?.[ogImageLink?.split("/")?.length - 1];
					if (imgName) {
						paths.push(`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${imgName}`);
					}
				}

				// Add meta_data.coverImage path if it exists
				const coverImageLink = item?.meta_data?.coverImage;
				if (coverImageLink) {
					const coverImageName =
						coverImageLink?.split("/")?.[
							coverImageLink?.split("/")?.length - 1
						];
					if (coverImageName) {
						paths.push(
							`${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${coverImageName}`,
						);
					}
				}

				return paths;
			}) || [],
		),
	];

	const { error: storageOgImageError } = await r2Helpers.deleteObjects(
		R2_MAIN_BUCKET_NAME,
		deleteImagePaths,
	);

	// delete file images in bucket, this will delete the video thumbnail too

	const deleteFileImagesPaths = apiData?.deleteData?.map((item) => {
		const name = item?.ogImage?.slice(
			Math.max(0, item?.ogImage.lastIndexOf("/") + 1),
		);

		return `${STORAGE_FILES_PATH}/${userId}/${name}`;
	});

	const { error: fileStorageError } = await r2Helpers.deleteObjects(
		R2_MAIN_BUCKET_NAME,
		deleteFileImagesPaths,
	);

	// deletes the videos
	// for this we get name from the url as the ogImage will only have the video thumbnail name
	const deleteFileVideoPaths = apiData?.deleteData?.map((item) => {
		const name = item?.url?.slice(Math.max(0, item?.url.lastIndexOf("/") + 1));
		return `${STORAGE_FILES_PATH}/${userId}/${name}`;
	});

	const { error: fileVideoStorageError } = await r2Helpers.deleteObjects(
		R2_MAIN_BUCKET_NAME,
		deleteFileVideoPaths,
	);

	// delete tags

	const deleteBookmarkIds = apiData?.deleteData?.map((item) => item?.id);

	const { error: bookmarkTagsError } = await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.delete()
		.in("bookmark_id", deleteBookmarkIds)
		.eq("user_id", userId)
		.select();

	// delete bookmarks

	const {
		data: bookmarksData,
		error: bookmarksError,
	}: { data: DataResponse; error: ErrorResponse } = await supabase
		.from(MAIN_TABLE_NAME)
		.delete()
		.in("id", deleteBookmarkIds)
		.eq("user_id", userId)
		.select();

	if (
		isNull(bookmarksError) &&
		isNull(bookmarkTagsError) &&
		isNull(fileStorageError) &&
		isNull(fileVideoStorageError) &&
		isNull(storageOgImageError) &&
		isNull(storageScreenshotOgImageError)
	) {
		response.status(200).json({
			data: bookmarksData,
			error: null,
		});
	} else {
		Sentry.captureException(`Delete bookmarks error`);
		response.status(500).json({
			data: bookmarksData,
			error:
				(storageScreenshotOgImageError
					? String(storageScreenshotOgImageError)
					: null) ??
				(storageOgImageError ? String(storageOgImageError) : null) ??
				(fileStorageError ? String(fileStorageError) : null) ??
				(fileVideoStorageError ? String(fileVideoStorageError) : null) ??
				bookmarkTagsError ??
				bookmarksError,
		});
	}
}
