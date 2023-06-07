import { type NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import { verify, type VerifyErrors } from "jsonwebtoken";
import { isNull } from "lodash";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMAKRS_STORAGE_NAME,
	BOOKMARK_TAGS_TABLE_NAME,
	FILES_STORAGE_NAME,
	MAIN_TABLE_NAME,
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
		data: { id: string; screenshot: string; title: SingleListData["title"] };
	}>,
	response: NextApiResponse<Data>,
) {
	const supabase = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const bookmarkData = request.body.data;

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

	const screenshot = bookmarkData?.screenshot;
	const screenshotImgName =
		screenshot?.split("/")[screenshot.split("/").length - 1];

	await supabase.storage
		.from(BOOKMAKRS_STORAGE_NAME)
		.remove([`public/${screenshotImgName}`]);

	await supabase.storage
		.from(FILES_STORAGE_NAME)
		.remove([`public/${bookmarkData?.title}`]);

	await supabase
		.from(BOOKMARK_TAGS_TABLE_NAME)
		.delete()
		.match({ bookmark_id: bookmarkData?.id })
		.select();

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.delete()
			.match({ id: bookmarkData?.id })
			.select();

	if (!isNull(data)) {
		response.status(200).json({ data, error });
	} else {
		response.status(500).json({ data, error });
		throw new Error("ERROR");
	}
}
