import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import { deleteEmbeddings } from "../../../async/supabaseCrudHelpers/ai/embeddings";
import {
	type DeleteBookmarkPayload,
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMAKRS_STORAGE_NAME,
	BOOKMARK_TAGS_TABLE_NAME,
	FILES_STORAGE_NAME,
	MAIN_TABLE_NAME,
	STORAGE_SCRAPPED_IMAGES_PATH,
	STORAGE_SCREENSHOT_IMAGES_PATH,
} from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

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
	const deleteScreenshotImagePaths = apiData?.deleteData?.map((item) => {
		const ogImageLink = item?.ogImage;
		const imgName = ogImageLink?.split("/")[ogImageLink.split("/").length - 1];
		return `${STORAGE_SCREENSHOT_IMAGES_PATH}/${userId}/${imgName}`;
	});

	const { error: storageScreenshotOgImageError } = (await supabase.storage
		.from(BOOKMAKRS_STORAGE_NAME)
		.remove(deleteScreenshotImagePaths)) as { error: ErrorResponse };

	// delete ogImages in bucket
	const deleteImagePaths = apiData?.deleteData?.map((item) => {
		const ogImageLink = item?.ogImage;
		const imgName = ogImageLink?.split("/")[ogImageLink.split("/").length - 1];
		return `${STORAGE_SCRAPPED_IMAGES_PATH}/${userId}/${imgName}`;
	});

	const { error: storageOgImageError } = (await supabase.storage
		.from(BOOKMAKRS_STORAGE_NAME)
		.remove(deleteImagePaths)) as { error: ErrorResponse };

	// delete file images in bucket, this will delete the video thumbnail too

	const deleteFileImagesPaths = apiData?.deleteData?.map((item) => {
		const name = item?.ogImage?.slice(
			Math.max(0, item?.ogImage.lastIndexOf("/") + 1),
		);

		return `public/${userId}/${name}`;
	});

	const { error: fileStorageError } = (await supabase.storage
		.from(FILES_STORAGE_NAME)
		.remove(deleteFileImagesPaths)) as { error: ErrorResponse };

	// deletes the videos
	// for this we get name from the url as the ogImage will only have the video thumbnail name
	const deleteFileVideoPaths = apiData?.deleteData?.map((item) => {
		const name = item?.url?.slice(Math.max(0, item?.url.lastIndexOf("/") + 1));
		return `public/${userId}/${name}`;
	});

	const { error: fileVideoStorageError } = (await supabase.storage
		.from(FILES_STORAGE_NAME)
		.remove(deleteFileVideoPaths)) as { error: ErrorResponse };

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
				storageOgImageError ??
				fileStorageError ??
				bookmarkTagsError ??
				bookmarksError,
		});
	}

	// delete embeddings
	try {
		await deleteEmbeddings(deleteBookmarkIds, request?.cookies, false);
	} catch (error_) {
		console.error("Delete embeddings error in delete bookmarks api", error_);
		Sentry.captureException(
			`Delete embeddings error in delete bookmarks api: ${error_}`,
		);
	}
}
