import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
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
} from "../../../utils/constants";

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
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const apiData = request.body.data;

	verify(
		request.body.access_token,
		process.env.SUPABASE_JWT_SECRET_KEY,
		(error_) => {
			if (error_) {
				response.status(500).json({ data: null, error: error_ });
				throw new Error("ERROR");
			}
		},
	);

	// TODO: uncomment after fixing screenshot issue
	// const screenshot = bookmarkData?.screenshot;
	// const screenshotImgName =
	// 	screenshot?.split("/")[screenshot.split("/").length - 1];

	// await supabase.storage
	// 	.from(BOOKMAKRS_STORAGE_NAME)
	// 	.remove([`public/${screenshotImgName}`]);

	// delete ogImages in bucket
	const deleteImagePaths = apiData?.deleteData?.map((item) => {
		const ogImageLink = item?.ogImage;
		const imgName = ogImageLink?.split("/")[ogImageLink.split("/").length - 1];
		return `${STORAGE_SCRAPPED_IMAGES_PATH}/${imgName}`;
	});

	const { error: storageOgImageError } = (await supabase.storage
		.from(BOOKMAKRS_STORAGE_NAME)
		.remove(deleteImagePaths)) as { error: ErrorResponse };

	// delete file images in bucket

	const deleteFileImagesPaths = apiData?.deleteData?.map(
		(item) => `public/${item?.title}`,
	);

	const { error: fileStorageError } = (await supabase.storage
		.from(FILES_STORAGE_NAME)
		.remove(deleteFileImagesPaths)) as { error: ErrorResponse };

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
		isNull(storageOgImageError)
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
