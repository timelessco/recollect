import { type NextApiResponse } from "next";
import { type PostgrestError } from "@supabase/supabase-js";
import { type VerifyErrors } from "jsonwebtoken";
import { isEmpty } from "lodash";
import { z } from "zod";

import {
	type NextApiRequest,
	type SingleListData,
} from "../../../types/apiTypes";
import { MAIN_TABLE_NAME } from "../../../utils/constants";
import { apiSupabaseClient } from "../../../utils/supabaseServerClient";

type DataResponse = SingleListData[] | null;
type ErrorResponse = PostgrestError | VerifyErrors | { message: string } | null;

type Data = {
	data: DataResponse;
	error: ErrorResponse;
};

const bodySchema = z.object({
	bookmark_id: z
		.number()
		.int()
		.positive("Bookmark ID must be a positive integer"),
	is_discoverable: z.boolean(),
});

export default async function handler(
	request: NextApiRequest<{
		bookmark_id: number;
		is_discoverable: boolean;
	}>,
	response: NextApiResponse<Data>,
): Promise<void> {
	if (request.method !== "POST") {
		response
			.status(405)
			.json({ data: null, error: { message: "Method not allowed" } });
		return;
	}

	const parseResult = bodySchema.safeParse(request.body);

	if (!parseResult.success) {
		response.status(400).json({
			data: null,
			error: { message: `Invalid request: ${parseResult.error.message}` },
		});
		return;
	}

	const { bookmark_id: bookmarkId, is_discoverable: isDiscoverable } =
		parseResult.data;

	const supabase = apiSupabaseClient(request, response);
	const { data: userData, error: userError } = await supabase.auth.getUser();
	const userId = userData?.user?.id;

	if (userError || !userId) {
		response
			.status(401)
			.json({ data: null, error: { message: "Unauthorized" } });
		return;
	}

	const { data, error }: { data: DataResponse; error: ErrorResponse } =
		await supabase
			.from(MAIN_TABLE_NAME)
			.update({ is_discoverable: isDiscoverable })
			.match({ id: bookmarkId, user_id: userId })
			.select();

	if (error) {
		response.status(500).json({ data: null, error });
		return;
	}

	if (isEmpty(data)) {
		response.status(404).json({
			data: null,
			error: { message: "Bookmark not found or you lack permission" },
		});
		return;
	}

	response.status(200).json({ data, error: null });
}
