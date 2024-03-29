import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import { isNull } from "lodash";

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
import {
	apiSupabaseClient,
	verifyAuthToken,
} from "../../../utils/supabaseServerClient";

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
	const supabase = apiSupabaseClient();

	const apiData = request.body.data;

	const { error: _error } = verifyAuthToken(request.body.access_token);

	if (_error) {
		response.status(500).json({ data: null, error: _error });
		throw new Error("ERROR: token error");
	}

	const tokenDecode: { sub: string } = jwtDecode(request.body.access_token);
	const userId = tokenDecode?.sub;

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

	// delete file images in bucket

	const deleteFileImagesPaths = apiData?.deleteData?.map(
		(item) => `public/${userId}/${item?.title}`,
	);

	const { error: fileStorageError } = (await supabase.storage
		.from(FILES_STORAGE_NAME)
		.remove(deleteFileImagesPaths)) as { error: ErrorResponse };

	// deletes the video thumbnails that are generated
	const deleteFileThumbnailImagesPaths = apiData?.deleteData?.map(
		(item) => `public/${userId}/thumbnail-${item?.title}`,
	);

	const { error: fileThumbnailStorageError } = (await supabase.storage
		.from(FILES_STORAGE_NAME)
		.remove(deleteFileThumbnailImagesPaths)) as { error: ErrorResponse };

	// delete tags

	const deleteBookmarkIds = apiData?.deleteData?.map((item) => item?.id);

	const { error: bookmarkTagsError } = await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.delete()
		.in("bookmark_id", deleteBookmarkIds)
		.select();

	// delete bookmarks

	const {
		data: bookmarksData,
		error: bookmarksError,
	}: { data: DataResponse; error: ErrorResponse } = await supabase
		.from(MAIN_TABLE_NAME)
		.delete()
		.in("id", deleteBookmarkIds)
		.select();

	if (
		isNull(bookmarksError) &&
		isNull(bookmarkTagsError) &&
		isNull(fileStorageError) &&
		isNull(fileThumbnailStorageError) &&
		isNull(storageOgImageError) &&
		isNull(storageScreenshotOgImageError)
	) {
		response.status(200).json({
			data: bookmarksData,
			error: null,
		});
	} else {
		response.status(500).json({
			data: bookmarksData,
			error:
				storageOgImageError ??
				fileStorageError ??
				bookmarkTagsError ??
				bookmarksError,
		});
	}
}
